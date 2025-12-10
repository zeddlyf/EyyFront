type Metric = { name: string; value: number; ts: number }

const buffer: Metric[] = []

export function trackMetric(name: string, value: number) {
  buffer.push({ name, value, ts: Date.now() })
}

export function getMetrics(name?: string): Metric[] {
  return name ? buffer.filter(m => m.name === name) : [...buffer]
}

export function timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  return fn().then(res => {
    trackMetric(name, Date.now() - start)
    return res
  })
}
