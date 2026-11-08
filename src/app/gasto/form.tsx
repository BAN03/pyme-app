import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { getBusiness } from '@/db/repos/business';
import { createExpense, deleteExpense, getExpense, updateExpense } from '@/db/repos/expenses';
import type { Business, Expense } from '@/db/types';
import { useQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';
import { centsToInput, currencySymbol, parseMoney } from '@/lib/money';

const CATEGORIES = [
  'Renta',
  'Servicios',
  'Insumos',
  'Marketing',
  'Transporte',
  'Equipo',
  'Otros',
];

export default function ExpenseFormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;

  const { data, loading } = useQuery(async (db) => {
    const business = await getBusiness(db);
    const expense = id ? await getExpense(db, id) : null;
    return { business, expense };
  });

  if (loading || !data) {
    return (
      <FormScreen title={id ? 'Editar gasto' : 'Nuevo gasto'}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </FormScreen>
    );
  }

  return (
    <ExpenseForm key={data.expense?.id ?? 'new'} business={data.business} expense={data.expense} />
  );
}

function ExpenseForm({ business, expense }: { business: Business; expense: Expense | null }) {
  const router = useRouter();
  const db = useSQLiteContext();
  const id = expense?.id;

  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [category, setCategory] = useState(expense?.category ?? 'Insumos');
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [note, setNote] = useState(expense?.note ?? '');
  const [saving, setSaving] = useState(false);

  const amountCents = parseMoney(amount);
  const currency = business.currency;

  const save = async () => {
    if (!description.trim()) {
      Alert.alert('Falta la descripción', 'Escribe en qué gastaste.');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Falta el monto', 'Escribe un monto mayor que cero.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        category,
        description,
        amountCents,
        date,
        note: note || null,
      };

      if (id) {
        await updateExpense(db, id, input);
      } else {
        await createExpense(db, business.id, input);
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
    Alert.alert('Eliminar gasto', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteExpense(db, id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <FormScreen
      title={id ? 'Editar gasto' : 'Nuevo gasto'}
      subtitle="Registra una salida de dinero"
      footer={
        <View style={styles.footer}>
          {id ? (
            <Button title="Eliminar" variant="ghost" onPress={confirmDelete} style={styles.flex} />
          ) : null}
          <Button
            title="Guardar gasto"
            onPress={save}
            loading={saving}
            size="lg"
            style={styles.flex}
          />
        </View>
      }>
      <TextField
        label="Monto"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        prefix={currencySymbol(currency)}
      />

      <TextField
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        placeholder="Ej. Renta del local"
      />

      <View style={styles.fieldGap}>
        <AppText variant="label" color="textSecondary">
          Categoría
        </AppText>
        <ChoiceChips
          options={(CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES]).map(
            (value) => ({ value, label: value }),
          )}
          value={category}
          onChange={setCategory}
        />
      </View>

      <DateField value={date} onChange={setDate} />

      <TextField
        label="Nota"
        value={note}
        onChangeText={setNote}
        placeholder="Opcional"
        multiline
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGap: {
    gap: 8,
  },
  loading: {
    paddingTop: 80,
    alignItems: 'center',
  },
});
