const mockStore = (() => {
  let store = {}
  return {
    getItem: async (k) => (k in store ? store[k] : null),
    setItem: async (k, v) => { store[k] = String(v) },
    removeItem: async (k) => { delete store[k] },
    clear: async () => { store = {} }
  }
})()

jest.mock('@react-native-async-storage/async-storage', () => mockStore)

