import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { getBusiness } from '@/db/repos/business';
import {
  createSupply,
  deleteSupply,
  getSupply,
  updateSupply,
} from '@/db/repos/supplies';
import type { Business, Supply } from '@/db/types';
import { useQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { centsToInput, currencySymbol, parseMoney, parseQuantity } from '@/lib/money';

export default function SupplyFormScreen() {
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
      <FormScreen title={id ? 'Editar insumo' : 'Nuevo insumo'}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </FormScreen>
    );
  }

  return (
    <SupplyForm key={data.supply?.id ?? 'new'} business={data.business} supply={data.supply} />
  );
}

function SupplyForm({ business, supply }: { business: Business; supply: Supply | null }) {
  const router = useRouter();
  const db = useSQLiteContext();
  const id = supply?.id;

  const [name, setName] = useState(supply?.name ?? '');
  const [unit, setUnit] = useState(supply?.unit ?? 'pza');
  const [unitCost, setUnitCost] = useState(supply ? centsToInput(supply.unitCostCents) : '');
  const [stock, setStock] = useState(supply ? String(supply.stock) : '');
  const [minStock, setMinStock] = useState(supply ? String(supply.minStock) : '');
  const [saving, setSaving] = useState(false);

  const currency = business.currency;

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del insumo.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        name,
        unit: unit || 'pza',
        stock: parseQuantity(stock),
        minStock: parseQuantity(minStock),
        unitCostCents: parseMoney(unitCost),
      };

      if (id) {
        await updateSupply(db, id, input);
      } else {
        await createSupply(db, business.id, input);
      }
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert('Eliminar insumo', 'Se borrará del catálogo de insumos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteSupply(db, id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <FormScreen
      title={id ? 'Editar insumo' : 'Nuevo insumo'}
      subtitle="Materia prima o material"
      footer={
        <View style={styles.footer}>
          {id ? (
            <Button title="Eliminar" variant="ghost" onPress={confirmDelete} style={styles.flex} />
          ) : null}
          <Button
            title="Guardar insumo"
            onPress={save}
            loading={saving}
            size="lg"
            style={styles.flex}
          />
        </View>
      }>
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Café en grano" />

      <View style={styles.row}>
        <TextField
          label="Unidad"
          value={unit}
          onChangeText={setUnit}
          placeholder="kg, L, pza"
          autoCapitalize="none"
          containerStyle={styles.flex}
        />
        <TextField
          label="Costo por unidad"
          value={unitCost}
          onChangeText={setUnitCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          containerStyle={styles.flex}
        />
      </View>

      <View style={styles.row}>
        <TextField
          label="Stock actual"
          value={stock}
          onChangeText={setStock}
          placeholder="0"
          keyboardType="decimal-pad"
          containerStyle={styles.flex}
        />
        <TextField
          label="Stock mínimo"
          value={minStock}
          onChangeText={setMinStock}
          placeholder="0"
          keyboardType="decimal-pad"
          containerStyle={styles.flex}
        />
      </View>

      <AppText variant="caption" color="textSecondary">
        Para sumar existencias usa el botón Comprar en la pestaña Catálogo. Así también se registra
        el gasto.
      </AppText>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  loading: {
    paddingTop: 80,
    alignItems: 'center',
  },
});
