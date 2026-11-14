import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { getBusiness } from '@/db/repos/business';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  updateCustomer,
} from '@/db/repos/customers';
import type { Business, Customer } from '@/db/types';
import { useQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { validateCustomerInput } from '@/lib/validation';

export default function CustomerFormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;

  const { data, loading } = useQuery(async (db) => {
    const business = await getBusiness(db);
    const customer = id ? await getCustomer(db, id) : null;
    return { business, customer };
  });

  if (loading || !data) {
    return (
      <FormScreen title={id ? 'Editar cliente' : 'Nuevo cliente'}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </FormScreen>
    );
  }

  return (
    <CustomerForm key={data.customer?.id ?? 'new'} business={data.business} customer={data.customer} />
  );
}

function CustomerForm({
  business,
  customer,
}: {
  business: Business;
  customer: Customer | null;
}) {
  const router = useRouter();
  const db = useSQLiteContext();
  const id = customer?.id;

  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const result = validateCustomerInput({ name, phone, email, notes });
    setErrors(result.errors);
    return result.valid;
  };

  const save = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      };

      if (id) {
        await updateCustomer(db, id, input);
      } else {
        await createCustomer(db, business.id, input);
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
    Alert.alert('Eliminar cliente', 'Sus ventas se conservarán sin cliente asociado.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteCustomer(db, id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <FormScreen
      title={id ? 'Editar cliente' : 'Nuevo cliente'}
      subtitle="Datos de contacto y notas"
      footer={
        <View style={styles.footer}>
          {id ? (
            <Button title="Eliminar" variant="ghost" onPress={confirmDelete} style={styles.flex} />
          ) : null}
          <Button
            title="Guardar cliente"
            onPress={save}
            loading={saving}
            size="lg"
            style={styles.flex}
          />
        </View>
      }>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Nombre completo"
        error={errors.name}
      />

      <TextField
        label="Teléfono"
        value={phone}
        onChangeText={setPhone}
        placeholder="Opcional"
        keyboardType="phone-pad"
        error={errors.phone}
      />

      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="Opcional"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.email}
      />

      <TextField
        label="Notas"
        value={notes}
        onChangeText={setNotes}
        placeholder="Preferencias, cumpleaños, seguimiento…"
        multiline
        error={errors.notes}
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
  loading: {
    paddingTop: 80,
    alignItems: 'center',
  },
});
