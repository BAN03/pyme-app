import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { getBusiness } from '@/db/repos/business';
import { getSupply, registerSupplyPurchase } from '@/db/repos/supplies';
import type { Business, Supply } from '@/db/types';
import { useQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';
import {
  currencySymbol,
  formatMoney,
  formatQuantity,
  parseMoney,
  parseQuantity,
} from '@/lib/money';

export default function SupplyPurchaseScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;

  const { data, loading } = useQuery(async (db) => {
    const business = await getBusiness(db);
    const supply = id ? await getSupply(db, id) : null;
    return { business, supply };
  });

  if (loading || !data) {
    return (
      <FormScreen title="Comprar insumo">
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </FormScreen>
    );
  }

  if (!data.supply) {
    return (
      <FormScreen title="Comprar insumo">
        <Card>
          <AppText variant="body" color="textSecondary">
            No encontramos este insumo. Vuelve al catálogo e inténtalo de nuevo.
          </AppText>
        </Card>
      </FormScreen>
    );
  }

  return (
    <SupplyPurchaseForm
      key={data.supply.id}
      business={data.business}
      supply={data.supply}
    />
  );
}

function SupplyPurchaseForm({ business, supply }: { business: Business; supply: Supply }) {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();

  const [quantity, setQuantity] = useState('1');
  const [totalCost, setTotalCost] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);
  const [saving, setSaving] = useState(false);

  const currency = business.currency;
  const quantityValue = parseQuantity(quantity);
  const totalCostCents = parseMoney(totalCost);
  const unitCostPreview =
    quantityValue > 0 ? Math.round(totalCostCents / quantityValue) : supply.unitCostCents;

  const save = async () => {
    if (quantityValue <= 0) {
      Alert.alert('Cantidad inválida', 'Escribe una cantidad mayor que cero.');
      return;
    }

    setSaving(true);
    try {
      await registerSupplyPurchase(db, business.id, {
        supplyId: supply.id,
        quantity: quantityValue,
        totalCostCents,
        date,
        note: note || null,
        recordExpense,
      });
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Comprar insumo"
      subtitle={supply.name}
      footer={<Button title="Registrar compra" onPress={save} loading={saving} size="lg" fullWidth />}>
      <Card style={styles.summary}>
        <View style={styles.rowBetween}>
          <AppText variant="bodyStrong">{supply.name}</AppText>
          <AppText variant="small" color="textSecondary">
            {formatQuantity(supply.stock)} {supply.unit} en stock
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          Costo actual: {formatMoney(supply.unitCostCents, currency)} / {supply.unit}
        </AppText>
      </Card>

      <View style={styles.row}>
        <TextField
          label="Cantidad comprada"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="decimal-pad"
          suffix={supply.unit}
          containerStyle={styles.flex}
        />
        <TextField
          label="Costo total"
          value={totalCost}
          onChangeText={setTotalCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          containerStyle={styles.flex}
        />
      </View>

      <Card style={styles.summary}>
        <AppText variant="label" color="textSecondary">
          Nuevo costo por unidad
        </AppText>
        <AppText variant="subtitle">
          {formatMoney(unitCostPreview, currency)} / {supply.unit}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Nuevo stock: {formatQuantity(supply.stock + quantityValue)} {supply.unit}
        </AppText>
      </Card>

      <DateField value={date} onChange={setDate} />

      <TextField
        label="Nota"
        value={note}
        onChangeText={setNote}
        placeholder="Proveedor, factura, etc. (opcional)"
        multiline
      />

      <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Registrar como gasto</AppText>
          <AppText variant="caption" color="textSecondary">
            Suma la compra a los egresos del mes.
          </AppText>
        </View>
        <Switch
          value={recordExpense}
          onValueChange={setRecordExpense}
          trackColor={{ false: theme.backgroundElement, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  summary: {
    gap: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loading: {
    paddingTop: 80,
    alignItems: 'center',
  },
});
