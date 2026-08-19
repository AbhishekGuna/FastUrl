export interface RawClickEvent {
  shortCode: string;
  timestamp: string; // ISO 8601
  ip: string;
  userAgent: string;
  referrer: string;
}

export interface EventPublisher {
  publishClick(event: RawClickEvent): Promise<void>;
}
