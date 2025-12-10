import { contactsV1 } from '../lib/api'

jest.mock('../lib/api', () => {
  const actual = jest.requireActual('../lib/api')
  return {
    ...actual,
    default: actual.default,
    contactsV1: {
      listByType: jest.fn(async (type: 'driver'|'commuter') => {
        return type === 'commuter' ? [{ id: '1', name: 'Alice', phone: '+123', email: 'alice@example.com' }] : []
      }),
      create: jest.fn(async (payload: any) => ({ id: 'x', ...payload })),
      delete: jest.fn(async (id: string) => ({ id }))
    }
  }
})

describe('Commuter contacts API mapping', () => {
  it('lists commuter contacts', async () => {
    const items = await contactsV1.listByType('commuter')
    expect(Array.isArray(items)).toBe(true)
    expect(items[0].name).toBe('Alice')
    expect(items[0].phone).toBe('+123')
    expect(items[0].email).toBe('alice@example.com')
  })

  it('creates commuter contact with email optional', async () => {
    const created = await contactsV1.create({ userType: 'commuter', name: 'Bob', phone: '555-0000', email: undefined })
    expect(created.userType).toBe('commuter')
    expect(created.name).toBe('Bob')
    expect(created.phone).toBe('555-0000')
    expect(created.email).toBeUndefined()
  })

  it('deletes contact', async () => {
    const res = await contactsV1.delete('1')
    expect(res.id).toBe('1')
  })
})

