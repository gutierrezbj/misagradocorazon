// Transporte de push intercambiable: Expo Push Service en real, uno falso en los tests.
import { Expo, type ExpoPushMessage, type ExpoPushReceipt, type ExpoPushTicket } from "expo-server-sdk";

import { env } from "../../env.ts";

export interface PushTransport {
  /** Un ticket por mensaje, en el mismo orden. */
  send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
  receipts(ticketIds: string[]): Promise<Record<string, ExpoPushReceipt>>;
}

class ExpoTransport implements PushTransport {
  private readonly expo = new Expo(env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {});

  async send(messages: ExpoPushMessage[]) {
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      tickets.push(...(await this.expo.sendPushNotificationsAsync(chunk)));
    }
    return tickets;
  }

  async receipts(ticketIds: string[]) {
    const out: Record<string, ExpoPushReceipt> = {};
    for (const chunk of this.expo.chunkPushNotificationReceiptIds(ticketIds)) {
      Object.assign(out, await this.expo.getPushNotificationReceiptsAsync(chunk));
    }
    return out;
  }
}

let transport: PushTransport | null = null;

export function pushTransport(): PushTransport {
  transport ??= new ExpoTransport();
  return transport;
}

/** Solo para tests. */
export function setPushTransport(t: PushTransport | null) {
  transport = t;
}
