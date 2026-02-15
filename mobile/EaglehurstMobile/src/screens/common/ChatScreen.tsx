/**
 * Chat Screen
 * Real-time messaging between buyers and sellers
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Loading, Avatar } from '../../components/common';
import { useAppSelector } from '../../store';
import { connectionsAPI } from '../../api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Message } from '../../types';

export const ChatScreen: React.FC = () => {
  const route = useRoute();
  const { connectionId } = route.params as { connectionId: string };
  const { user } = useAppSelector((state) => state.auth);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    // Mark messages as read
    markAsRead();
  }, [connectionId]);

  const loadMessages = async () => {
    try {
      const response = await connectionsAPI.getConnectionMessages(connectionId);
      if (response.success && response.data) {
        setMessages(response.data.items.reverse());
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await connectionsAPI.markMessagesAsRead(connectionId);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const tempMessage: Message = {
      message_id: `temp-${Date.now()}`,
      connection_id: connectionId,
      sender_id: user?.user_id || '',
      message_text: messageText.trim(),
      sent_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages([...messages, tempMessage]);
    setMessageText('');
    setIsSending(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await connectionsAPI.sendMessage(connectionId, messageText.trim());
      if (response.success && response.data) {
        // Replace temp message with actual message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === tempMessage.message_id ? response.data! : msg
          )
        );
      } else {
        // Remove temp message on failure
        setMessages((prev) =>
          prev.filter((msg) => msg.message_id !== tempMessage.message_id)
        );
        Alert.alert('Error', response.error?.message || 'Failed to send message');
      }
    } catch (error: any) {
      setMessages((prev) =>
        prev.filter((msg) => msg.message_id !== tempMessage.message_id)
      );
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.user_id;
    const timestamp = new Date(item.sent_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}>
        {!isOwnMessage && (
          <Avatar name={item.sender_name || 'User'} size={32} style={styles.avatar} />
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}>
          {!isOwnMessage && item.sender_name && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}>
            {item.message_text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
            ]}>
            {timestamp}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>Start a Conversation</Text>
      <Text style={styles.emptyMessage}>
        Send a message to begin chatting with this connection
      </Text>
    </View>
  );

  if (isLoading) {
    return <Loading fullScreen message="Loading messages..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || isSending}>
          <Text style={styles.sendButtonText}>
            {isSending ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  messagesList: {
    padding: spacing.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: borderRadius.xs,
  },
  otherMessageBubble: {
    backgroundColor: colors.background.paper,
    borderBottomLeftRadius: borderRadius.xs,
  },
  senderName: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.neutral.white,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  messageTime: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  ownMessageTime: {
    color: colors.neutral.white,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: colors.text.hint,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.titleLarge,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.text.primary,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  sendButtonText: {
    fontSize: 20,
  },
});

export default ChatScreen;

