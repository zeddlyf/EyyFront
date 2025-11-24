import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import StarRating from '../../../../components/StarRating';
import { rideAPI } from '../../../../lib/api';

export default function RideFeedback() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Optionally load existing feedback
  }, [id]);

  const submit = async () => {
    if (!id) { Alert.alert('Error', 'No ride ID'); return; }
    if (rating < 1) { Alert.alert('Validation', 'Please provide a rating'); return; }
    if (feedback.length < 20 || feedback.length > 500) { Alert.alert('Validation', 'Feedback must be 20-500 characters'); return; }
    try {
      setSubmitting(true);
      await rideAPI.rateRide(id, rating, feedback);
      Alert.alert('Thank you', 'Your review has been submitted');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rate Your Ride</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Star Rating</Text>
        <StarRating value={rating} onChange={setRating} accessibilityLabel="Star rating" />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Feedback</Text>
        <TextInput
          accessibilityLabel="Written feedback"
          style={styles.input}
          multiline
          numberOfLines={5}
          maxLength={500}
          placeholder="Share your experience (min 20 characters)"
          value={feedback}
          onChangeText={setFeedback}
        />
        <Text style={styles.counter}>{feedback.length}/500</Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Submit review"
        style={[styles.button, submitting && { opacity: 0.7 }]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  section: { marginBottom: 16 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  input: { borderColor: '#d1d5db', borderWidth: 1, borderRadius: 8, padding: 10, textAlignVertical: 'top' },
  counter: { textAlign: 'right', color: '#6b7280', fontSize: 12, marginTop: 4 },
  button: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});