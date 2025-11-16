use wasm_bindgen::prelude::*;

/// High-performance convolution of two probability arrays
/// This is the core bottleneck in dice distribution calculations
#[wasm_bindgen]
pub fn convolve(a: &[f64], b: &[f64]) -> Vec<f64> {
    let result_len = a.len() + b.len() - 1;
    let mut result = vec![0.0; result_len];
    
    for i in 0..a.len() {
        let a_val = a[i];
        if a_val == 0.0 {
            continue; // Skip zero probabilities
        }
        
        for j in 0..b.len() {
            let b_val = b[j];
            if b_val == 0.0 {
                continue;
            }
            
            result[i + j] += a_val * b_val;
        }
    }
    
    result
}

/// Fast max/min calculation for advantage/disadvantage
#[wasm_bindgen]
pub fn max_or_min_dist(
    min_a: i32,
    max_a: i32,
    p_a: &[f64],
    min_b: i32,
    max_b: i32,
    p_b: &[f64],
    use_max: bool,
) -> Vec<f64> {
    let new_min = if use_max {
        std::cmp::max(min_a, min_b)
    } else {
        std::cmp::min(min_a, min_b)
    };
    
    let new_max = if use_max {
        std::cmp::max(max_a, max_b)
    } else {
        std::cmp::min(max_a, max_b)
    };
    
    let result_len = (new_max - new_min + 1) as usize;
    let mut result = vec![0.0; result_len + 2]; // +2 for min/max at end
    
    for i in 0..p_a.len() {
        let i_val = min_a + i as i32;
        let p_i = p_a[i];
        if p_i == 0.0 {
            continue;
        }
        
        for j in 0..p_b.len() {
            let j_val = min_b + j as i32;
            let p_j = p_b[j];
            if p_j == 0.0 {
                continue;
            }
            
            let val = if use_max {
                std::cmp::max(i_val, j_val)
            } else {
                std::cmp::min(i_val, j_val)
            };
            
            let idx = (val - new_min) as usize;
            result[idx] += p_i * p_j;
        }
    }
    
    // Append min and max as last two elements for easy extraction
    result[result_len] = new_min as f64;
    result[result_len + 1] = new_max as f64;
    
    result
}

/// Ultra-optimized batch damage calculation
/// This is the HOTTEST path - millions of iterations
#[wasm_bindgen]
pub fn calculate_batch_damage_stats(
    proficiency_bonus: i32,
    attack_bonus: i32,
    monster_ac: i32,
    
    // d20 distribution
    d20_min: i32,
    d20_max: i32,
    d20_p: &[f64],
    
    // Base damage distribution
    base_min: i32,
    base_max: i32,
    base_p: &[f64],
    
    // Crit damage distribution (can be same as base if no crits)
    crit_min: i32,
    crit_max: i32,
    crit_p: &[f64],
    
    // d4 distributions (flattened)
    d4_mins: &[i32],
    d4_maxs: &[i32],
    d4_p_lengths: &[usize],
    d4_p_flat: &[f64],
    
    consider_crits: bool,
    view_mode_relative: bool,
) -> Vec<f64> {
    // Prepare result storage: 5 percentiles × proficiency_bonus
    let mut all_outcomes: Vec<Vec<(i32, f64)>> = vec![Vec::new(); proficiency_bonus as usize];
    
    // Reconstruct d4 distributions from flattened arrays
    let mut d4_dists: Vec<(i32, i32, &[f64])> = Vec::new();
    let mut offset = 0;
    for i in 0..proficiency_bonus as usize {
        let len = d4_p_lengths[i];
        d4_dists.push((d4_mins[i], d4_maxs[i], &d4_p_flat[offset..offset + len]));
        offset += len;
    }
    
    // MEGA OPTIMIZATION: Single pass through all combinations
    for d20_idx in 0..d20_p.len() {
        let d20_roll = d20_min + d20_idx as i32;
        let d20_prob = d20_p[d20_idx];
        if d20_prob == 0.0 {
            continue;
        }
        
        for base_idx in 0..base_p.len() {
            let base_dmg = base_min + base_idx as i32;
            let base_prob = base_p[base_idx];
            if base_prob == 0.0 {
                continue;
            }
            
            // Handle crits
            let crit_iter_len = if consider_crits { crit_p.len() } else { 1 };
            for crit_idx in 0..crit_iter_len {
                let crit_dmg = if consider_crits {
                    crit_min + crit_idx as i32
                } else {
                    0
                };
                let crit_prob = if consider_crits {
                    crit_p[crit_idx]
                } else {
                    1.0
                };
                
                if crit_prob == 0.0 {
                    continue;
                }
                
                let baseline_damage_prob = d20_prob * base_prob * crit_prob;
                
                // Calculate baseline damage (without d4s) once
                let damage_without_d4s = if view_mode_relative {
                    if d20_roll == 1 {
                        0
                    } else if d20_roll == 20 {
                        if consider_crits { crit_dmg } else { base_dmg }
                    } else {
                        let roll_without_d4s = d20_roll + attack_bonus;
                        if roll_without_d4s >= monster_ac { base_dmg } else { 0 }
                    }
                } else {
                    0
                };
                
                // Branch for each d4 count
                for d4_count_idx in 0..proficiency_bonus as usize {
                    let (d4_min, _d4_max, d4_p) = d4_dists[d4_count_idx];
                    
                    for d4_idx in 0..d4_p.len() {
                        let d4_value = d4_min + d4_idx as i32;
                        let d4_prob = d4_p[d4_idx];
                        if d4_prob == 0.0 {
                            continue;
                        }
                        
                        let total_prob = baseline_damage_prob * d4_prob;
                        
                        // Calculate damage with d4s
                        let damage_with_d4s = if d20_roll == 1 {
                            0
                        } else if d20_roll == 20 {
                            if consider_crits {
                                crit_dmg + (d4_value * 2)
                            } else {
                                base_dmg + (d4_value * 2)
                            }
                        } else {
                            let roll_with_d4s = d20_roll + attack_bonus - d4_value;
                            if roll_with_d4s >= monster_ac {
                                base_dmg + (d4_value * 2)
                            } else {
                                0
                            }
                        };
                        
                        let result = if view_mode_relative {
                            damage_with_d4s - damage_without_d4s
                        } else {
                            damage_with_d4s
                        };
                        
                        all_outcomes[d4_count_idx].push((result, total_prob));
                    }
                }
            }
        }
    }
    
    // Calculate percentiles for each d4 count
    let mut final_results = Vec::with_capacity(proficiency_bonus as usize * 5);
    
    for outcomes in all_outcomes {
        if outcomes.is_empty() {
            final_results.extend_from_slice(&[0.0, 0.0, 0.0, 0.0, 0.0]);
            continue;
        }
        
        // Build distribution
        let min_val = outcomes.iter().map(|(v, _)| *v).min().unwrap();
        let max_val = outcomes.iter().map(|(v, _)| *v).max().unwrap();
        let dist_len = (max_val - min_val + 1) as usize;
        let mut dist = vec![0.0; dist_len];
        
        for (value, prob) in outcomes {
            dist[(value - min_val) as usize] += prob;
        }
        
        // Calculate CDF
        let mut cdf = vec![0.0; dist_len];
        let mut cumulative = 0.0;
        for i in 0..dist_len {
            cumulative += dist[i];
            cdf[i] = cumulative;
        }
        
        // Find percentiles
        let percentiles = [0.05, 0.25, 0.50, 0.75, 0.95];
        for &target in &percentiles {
            let mut percentile_val = max_val;
            for i in 0..cdf.len() {
                if cdf[i] >= target {
                    percentile_val = min_val + i as i32;
                    break;
                }
            }
            final_results.push(percentile_val as f64);
        }
    }
    
    final_results
}

/// Fast percentile calculation from a distribution
#[wasm_bindgen]
pub fn calculate_percentiles(min: i32, max: i32, p: &[f64]) -> Vec<f64> {
    let mut cdf = vec![0.0; p.len()];
    let mut cumulative = 0.0;
    
    for i in 0..p.len() {
        cumulative += p[i];
        cdf[i] = cumulative;
    }
    
    let percentiles = [0.05, 0.25, 0.50, 0.75, 0.95];
    let mut results = Vec::with_capacity(5);
    
    for &target in &percentiles {
        let mut percentile_val = max;
        for i in 0..cdf.len() {
            if cdf[i] >= target {
                percentile_val = min + i as i32;
                break;
            }
        }
        results.push(percentile_val as f64);
    }
    
    results
}
