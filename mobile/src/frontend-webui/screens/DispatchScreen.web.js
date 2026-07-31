import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WebCard, WebBadge, WebBtn, WebInput, WebModal } from '../components/WebUI.web';

export default function DispatchScreen({ apiBaseUrl, session }) {
  const [productName, setProductName] = useState('');
  const [colorsUsed, setColorsUsed] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destinationType, setDestinationType] = useState('External Client / Customer');
  const [destinationCompany, setDestinationCompany] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('A1 Transport');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚚 Dispatch & Delivery System</Text>
        <Text style={styles.headerSubtitle}>Record dispatches and view daily bill-style delivery reports</Text>
      </View>

      <WebCard style={styles.mainCard}>
        <View style={styles.cardSectionHeader}>
          <Text style={styles.cardSectionTitle}>🏢 Bharath Enterprises Dispatch</Text>
          <Text style={styles.cardSectionSub}>Product Type: FOIL</Text>
        </View>

        <View style={styles.fieldGrid}>
          <WebInput label="Product Name / Item Description *" value={productName} onChangeText={setProductName} placeholder="e.g. Paracetamol Foil 100mm" style={{ width: '100%' }} />

          <View style={styles.halfWidth}>
            <WebInput label="Color(s) Used (comma separated)" value={colorsUsed} onChangeText={setColorsUsed} placeholder="e.g. Red, Silver, Blue" />
          </View>
          <View style={styles.halfWidth}>
            <WebInput label="Weight (kg) *" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="e.g. 25.5" />
          </View>

          <View style={styles.halfWidth}>
            <WebInput label="Dimensions / Size *" value={dimensions} onChangeText={setDimensions} placeholder="e.g. 100mm x 500m" />
          </View>
          <View style={styles.halfWidth}>
            <WebInput label="Quantity *" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="e.g. 5" />
          </View>

          <View style={styles.halfWidth}>
            <WebInput label="Destination Type" value={destinationType} onChangeText={setDestinationType} placeholder="External Client / Customer" />
          </View>
          <View style={styles.halfWidth}>
            <WebInput label="Destination Company Name *" value={destinationCompany} onChangeText={setDestinationCompany} placeholder="e.g. Sun Pharma / Cipla Ltd" />
          </View>

          <View style={styles.halfWidth}>
            <WebInput label="Delivery Method *" value={deliveryMethod} onChangeText={setDeliveryMethod} placeholder="🚚 A1 Transport" />
          </View>
          <View style={styles.halfWidth}>
            <WebInput label="Dispatch Date *" value={dispatchDate} onChangeText={setDispatchDate} placeholder="29-07-2026 📅" />
          </View>
        </View>

        <WebBtn label="🚀 Submit Dispatch Entry" onPress={() => alert('Dispatch Recorded')} variant="primary" size="lg" style={{ marginTop: 24, alignSelf: 'flex-start' }} />
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 24 },
  header: { marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  mainCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cardSectionHeader: { marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardSectionTitle: { fontSize: 18, fontWeight: '800', color: '#4338ca' },
  cardSectionSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  halfWidth: { width: '48.5%', minWidth: 280 },
});
