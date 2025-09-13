// Extended Express types for custom middleware

declare global {
  namespace Express {
    interface Request {
      brokerMandate?: import('@shared/schema').Mandate;
    }
  }
}

export {};