import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import type { MonthlyPoint } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatCompactMoney } from '@/lib/money';

type IncomeExpenseChartProps = {
  data: MonthlyPoint[];
  currency: string;
  height?: number;
};

const LEFT_PAD = 44;
const RIGHT_PAD = 4;
const TOP_PAD = 8;
const BOTTOM_PAD = 22;

export function IncomeExpenseChart({ data, currency, height = 180 }: IncomeExpenseChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const maxCents = Math.max(1, ...data.flatMap((point) => [point.incomeCents, point.expenseCents]));
  const maxValue = niceMax(maxCents / 100);
  const plotWidth = Math.max(0, width - LEFT_PAD - RIGHT_PAD);
  const plotHeight = Math.max(0, height - TOP_PAD - BOTTOM_PAD);
  const groupWidth = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(Math.max(groupWidth * 0.26, 4), 16);
  const barGap = 3;

  const yFor = (value: number) => TOP_PAD + plotHeight - (value / maxValue) * plotHeight;
  const gridValues = [maxValue, maxValue / 2, 0];

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <LegendDot color={theme.primary} label="Ingresos" />
        <LegendDot color={theme.danger} label="Egresos" />
      </View>

      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {gridValues.map((value) => {
              const y = yFor(value);
              return (
                <G key={value}>
                  <Line
                    x1={LEFT_PAD}
                    y1={y}
                    x2={width - RIGHT_PAD}
                    y2={y}
                    stroke={theme.border}
                    strokeWidth={1}
                    strokeDasharray={value === 0 ? undefined : '3,4'}
                  />
                  <SvgText
                    x={LEFT_PAD - 6}
                    y={y + 4}
                    fill={theme.textSecondary}
                    fontSize={9}
                    textAnchor="end">
                    {formatCompactMoney(value * 100, currency)}
                  </SvgText>
                </G>
              );
            })}

            {data.map((point, index) => {
              const center = LEFT_PAD + groupWidth * (index + 0.5);
              const incomeHeight = Math.max(0, (point.incomeCents / 100 / maxValue) * plotHeight);
              const expenseHeight = Math.max(0, (point.expenseCents / 100 / maxValue) * plotHeight);

              return (
                <G key={point.month}>
                  {incomeHeight > 0 ? (
                    <Rect
                      x={center - barGap / 2 - barWidth}
                      y={TOP_PAD + plotHeight - incomeHeight}
                      width={barWidth}
                      height={incomeHeight}
                      rx={3}
                      fill={theme.primary}
                    />
                  ) : null}
                  {expenseHeight > 0 ? (
                    <Rect
                      x={center + barGap / 2}
                      y={TOP_PAD + plotHeight - expenseHeight}
                      width={barWidth}
                      height={expenseHeight}
                      rx={3}
                      fill={theme.danger}
                    />
                  ) : null}
                  <SvgText
                    x={center}
                    y={height - 6}
                    fill={theme.textSecondary}
                    fontSize={10}
                    textAnchor="middle">
                    {point.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
