import React from 'react';
import * as echarts from 'echarts';
import { InputGroupValues } from './input-group';
import { useDamageData } from '@/hooks/useDamageData';


interface ChartProps {
  values: InputGroupValues;
}

export const Chart: React.FC<ChartProps> = ({ values }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { boxPlotData, categories } = useDamageData(values);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Extract median values (3rd element in each boxplot data array)
    const medianData = boxPlotData.map((data) => {
      const medianValue = data[2]; // Q2 is at index 2
      return medianValue;
    });

    // Create bar chart colors based on value
    const barColors = medianData.map((value) => (value < 0 ? '#ef4444' : '#3b82f6'));

    const option: echarts.EChartsOption = {
      title: {
        text: 'Expected Damage by d4 Penalty',
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
                Expected Damage: ${param.value.toFixed(2)}
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
          name: 'Expected Damage',
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

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [boxPlotData, categories]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div
        ref={chartRef}
        style={{ width: '100%', height: '500px' }}
        className="rounded-lg overflow-hidden"
      />
      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>
          <strong>Interpretation:</strong> Blue bars represent positive expected damage changes, while red bars represent negative changes. This shows the expected damage delta for each d4 penalty option.
        </p>
      </div>
    </div>
  );
};
