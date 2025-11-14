import React, { useState } from 'react';
import * as echarts from 'echarts';
import { InputGroupValues } from './input-group';
import { useDamageData } from '@/hooks/useDamageData';


interface ChartProps {
  values: InputGroupValues;
}

export const Chart: React.FC<ChartProps> = ({ values }) => {
  const [showBarChart, setShowBarChart] = useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { boxPlotData, categories, boxPlotColors, enableBoxPlot } = useDamageData(values);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    if (showBarChart) {
      // Extract median values (3rd element in each boxplot data array)
      const medianData = boxPlotData.map((data) => {
        const medianValue = data[2]; // Q2 is at index 2
        return medianValue;
      });

      // Create bar chart colors based on value
      const barColors = medianData.map((value) => (value < 0 ? '#ef4444' : '#3b82f6'));

      const option: echarts.EChartsOption = {
        title: {
          text: 'Expected Damage Distribution by d4 Penalty (Median Values)',
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
          name: 'Expected Damage',
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
          text: 'Expected Damage Distribution by d4 Penalty',
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
          name: 'Expected Damage',
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
  }, [boxPlotData, categories, boxPlotColors, showBarChart]);

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
          <strong>Interpretation:</strong> {showBarChart ? 'The bar chart displays the median expected damage for each d4 penalty option, with blue bars representing positive expected damage and red bars representing negative expected damage.' : 'Each boxplot shows the distribution of damage. The box represents the interquartile range (Q1 to Q3), the line inside the box is the median, and the whiskers extend to the 5th and 95th percentiles.'}
        </p>
      </div>
    </div>
  );
};
