/** A phone's camera, for reading a QR code: its view, or none where there is no camera or leave. */
export interface SystemCamera {
  open(): Promise<MediaStream | null>;
}
