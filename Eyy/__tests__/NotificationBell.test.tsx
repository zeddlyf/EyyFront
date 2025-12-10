import React from 'react'
import renderer, { act } from 'react-test-renderer'
import NotificationBell from '../components/NotificationBell'

jest.mock('../lib/notifications-context', () => {
  const React = require('react')
  return {
    useNotifications: () => ({
      notifications: [
        { id: '1', title: 'Hello', body: 'World', category: 'informational', timestamp: Date.now(), read: false },
      ],
      unreadCount: 1,
      markRead: jest.fn(async () => {}),
      markAllRead: jest.fn(async () => {}),
      loading: false,
      add: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    }),
  }
})

describe('NotificationBell', () => {
  it('renders badge when unreadCount > 0', () => {
    const tree = renderer.create(<NotificationBell />).root
    const badgeText = tree.findAllByProps({ accessibilityLabel: '1 unread' })
    expect(badgeText.length).toBeGreaterThan(0)
  })

  it('opens modal on press', () => {
    const inst = renderer.create(<NotificationBell />)
    const root = inst.root
    const press = root.findAllByProps({ accessibilityLabel: 'Notifications' })[0]
    act(() => { press.props.onPress() })
    const modals = root.findAllByType(require('react-native').Modal)
    expect(modals[0].props.visible).toBe(true)
  })
})
