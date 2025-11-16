import React, { useState } from 'react';
import * as echarts from 'echarts';
import { UseDamageDataResult } from '@/hooks/useDamageData';


interface ChartProps {
  damageData: UseDamageDataResult;
}

export const Chart: React.FC<ChartProps> = ({ damageData }) => {
  const [showBarChart, setShowBarChart] = useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { boxPlotData, categories, boxPlotColors, enableBoxPlot, consideringCrits, viewMode } = damageData;

  React.useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    if (showBarChart) {
      // Extract median values (3rd element in each boxplot data array)
      const medianData = boxPlotData.map((data) => {
        const medianValue = data[2]; // Q2 is at index 2
        return medianValue;
      });

      // Create bar chart colors based on view mode
      const barColors = medianData.map((value) => {
        if (viewMode === 'absolute') {
          // In absolute mode, use blue for all bars
          return '#3b82f6';
        } else {
          // In relative mode, use red for negative, blue for positive
          return value < 0 ? '#ef4444' : '#3b82f6';
        }
      });

      const option: echarts.EChartsOption = {
        title: {
          text: `${viewMode === 'absolute' ? 'Total Expected Damage' : 'Expected Damage Gain'} by d4 Penalty (Median Values)${consideringCrits ? ' - Including Critical Hits' : ''}`,
          left: 'center',
          textStyle: {
            color: '#1f2937',
          },
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          formatter: (params: unknown) => {
            if (Array.isArray(params) && params.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const param = params[0] as any;
              return `
                <div style="padding: 8px;">
                  <strong>${param.name}</strong><br/>
                  Median Damage: ${param.value.toFixed(2)}
                </div>
              `;
            }
            return '';
          },
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '15%',
          top: '15%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            color: '#6b7280',
          },
          axisLine: {
            lineStyle: {
              color: '#d1d5db',
            },
          },
        },
        yAxis: {
          type: 'value',
          name: viewMode === 'absolute' ? 'Total Expected Damage' : 'Expected Damage Gain',
          nameTextStyle: {
            color: '#374151',
          },
          axisLabel: {
            color: '#6b7280',
          },
          axisLine: {
            lineStyle: {
              color: '#d1d5db',
            },
          },
          splitLine: {
            lineStyle: {
              color: '#e5e7eb',
            },
          },
        },
        series: [
          {
            name: 'Median Damage',
            type: 'bar',
            data: medianData.map((value, index) => ({
              value,
              itemStyle: {
                color: barColors[index],
              },
            })),
          } as unknown as echarts.BarSeriesOption,
        ],
        dark: false,
      };

      chart.setOption(option);
    } else {
      const option: echarts.EChartsOption = {
        title: {
          text: `${viewMode === 'absolute' ? 'Total Expected Damage' : 'Expected Damage'} Distribution by d4 Penalty${consideringCrits ? ' - Including Critical Hits' : ''}`,
          left: 'center',
          textStyle: {
            color: '#1f2937', // dark gray
          },
        },
        tooltip: {
          trigger: 'item',
          axisPointer: {
            type: 'shadow',
          },
          formatter: (params: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const param = params as any;
            const dataIndex = param.dataIndex;
            const data = boxPlotData[dataIndex];
            const [p5, q1, q2, q3, p95] = data;
            return `
              <div style="padding: 8px;">
                <strong>${categories[dataIndex]}</strong><br/>
                5th percentile: ${p5.toFixed(2)}<br/>
                Q1: ${q1.toFixed(2)}<br/>
                Median (Q2): ${q2.toFixed(2)}<br/>
                Q3: ${q3.toFixed(2)}<br/>
                95th percentile: ${p95.toFixed(2)}
              </div>
            `;
          },
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '15%',
          top: '15%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            color: '#6b7280',
          },
          axisLine: {
            lineStyle: {
              color: '#d1d5db',
            },
          },
        },
        yAxis: {
          type: 'value',
          name: viewMode === 'absolute' ? 'Total Expected Damage' : 'Expected Damage Gain',
          nameTextStyle: {
            color: '#374151',
          },
          axisLabel: {
            color: '#6b7280',
          },
          axisLine: {
            lineStyle: {
              color: '#d1d5db',
            },
          },
          splitLine: {
            lineStyle: {
              color: '#e5e7eb',
            },
          },
        },
        series: [
          {
            name: 'Damage Range',
            type: 'boxplot',
            data: boxPlotData.map((data, index) => ({
              value: data,
              itemStyle: {
                color: boxPlotColors[index],
                borderColor: '#000',
              },
            })),
            clip: false,
          } as unknown as echarts.BoxplotSeriesOption,
        ],
        dark: false,
      };

      chart.setOption(option);
    }

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [boxPlotData, categories, boxPlotColors, showBarChart, consideringCrits, viewMode]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div></div>
        <button
          onClick={() => setShowBarChart((prev) => !prev)}
          disabled={!enableBoxPlot}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            enableBoxPlot
              ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
          title={!enableBoxPlot ? 'Box plot only available for simple number base damage' : showBarChart ? 'Currently showing bar chart' : 'Switch to bar chart'}
        >
          {showBarChart ? 'Show Box Plot' : 'Show Bar Chart'}
        </button>
      </div>
      <div
        ref={chartRef}
        style={{ width: '100%', height: '500px' }}
        className="rounded-lg overflow-hidden"
      />
      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>
          <strong>Interpretation:</strong> {showBarChart 
            ? (viewMode === 'absolute' 
                ? 'The bar chart displays the median total expected damage for each d4 penalty option. Blue bars show the expected damage when using that number of d4s.' 
                : 'The bar chart displays the median expected damage gain for each d4 penalty option, with blue bars representing positive expected damage gain and red bars representing negative expected damage gain compared to not using d4s.')
            : (viewMode === 'absolute'
                ? 'Each boxplot shows the distribution of total expected damage when using that number of d4s. The box represents the interquartile range (Q1 to Q3), the line inside the box is the median, and the whiskers extend to the 5th and 95th percentiles.'
                : 'Each boxplot shows the distribution of damage gain compared to not using d4s. The box represents the interquartile range (Q1 to Q3), the line inside the box is the median, and the whiskers extend to the 5th and 95th percentiles.')
          }
        </p>
      </div>
    </div>
  );
};
