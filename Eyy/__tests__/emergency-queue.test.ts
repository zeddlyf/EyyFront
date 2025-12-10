import { enqueueEmergency, processQueue, sendEmergencyAlert } from '../lib/emergency'

jest.mock('../lib/emergency', () => {
  const actual = jest.requireActual('../lib/emergency')
  return {
    ...actual,
    sendEmergencyAlert: jest.fn(async (p: any) => {
      if (p.message === 'FAIL') throw new Error('net')
      return { recipients: ['+123'] }
    })
  }
})

describe('Emergency queue', () => {
  it('queues on failure and processes later', async () => {
    await enqueueEmergency({ driverId: '1', message: 'FAIL', includeLocation: true })
    await processQueue()
    const res = await sendEmergencyAlert({ driverId: '1', message: 'OK', includeLocation: true })
    expect(res.recipients.length).toBe(1)
  })
})

