import { useState, useEffect } from 'react'

export function useApi<T>(apiCall: () => Promise<any>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiCall()
        setData(response.data)
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiCall()
      setData(response.data)
      return response.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}

export function useAsyncOperation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await operation()
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { execute, loading, error, setError }
}