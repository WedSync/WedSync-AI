// Placeholder notification service
export async function sendImmediateNotification(
  notification: any,
  recipients: string[],
): Promise<void> {
  console.log(
    'Sending immediate notification:',
    notification.title,
    'to:',
    recipients,
  );
}

export async function scheduleNotification(
  notification: any,
  recipients: string[],
  when: Date,
): Promise<void> {
  console.log(
    'Scheduling notification:',
    notification.title,
    'for:',
    when.toISOString(),
  );
}
