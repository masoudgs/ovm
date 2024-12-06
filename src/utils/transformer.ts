import { z } from 'zod'

export const stringToJSONSchema = z.string().pipe(
  z.preprocess(
    (input) => {
      try {
        return JSON.parse(input as string)
      } catch {
        throw new Error('Invalid JSON format')
      }
    },
    z.union([z.object({}).passthrough(), z.array(z.unknown())]),
  ),
)
