type AnalyticsEvent =
  | 'copy_room_code'
  | 'create_room'
  | 'join_room'
  | 'local_started'
  | 'online_started'
  | 'room_reconnecting_player'
  | 'round_finished'
  | 'share_room_code';

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: AnalyticsEvent, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return;

  const dataLayerWindow = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
  };

  dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
  dataLayerWindow.dataLayer.push({
    event,
    ...payload,
  });
}
