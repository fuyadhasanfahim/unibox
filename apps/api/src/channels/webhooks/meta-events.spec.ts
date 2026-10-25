import { parseMetaPayload } from './meta-events.js';

const wa = (value: object) => ({ object: 'whatsapp_business_account', entry: [{ id: 'waba1', changes: [{ field: 'messages', value }] }] });
const meta = { phone_number_id: 'pn1' };

describe('parseMetaPayload', () => {
  it('reads WhatsApp messages with the sender profile name, and statuses', () => {
    const events = parseMetaPayload(
      wa({
        metadata: meta,
        contacts: [{ wa_id: '8801700000000', profile: { name: 'Rafi' } }],
        messages: [{ id: 'wamid.1', from: '8801700000000', timestamp: '1700000000', type: 'text', text: { body: 'hello' } }],
        statuses: [{ id: 'wamid.2', status: 'delivered', timestamp: '1700000001' }, { id: 'wamid.3', status: 'deleted', timestamp: '1' }],
      }),
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      key: 'whatsapp:message:wamid.1',
      channel: 'whatsapp',
      accountId: 'pn1',
      message: { from: '8801700000000', name: 'Rafi', text: 'hello', at: '2023-11-14T22:13:20.000Z' },
    });
    expect(events[1]).toMatchObject({ key: 'whatsapp:status:wamid.2:delivered', kind: 'status' });
  });

  it('reads Messenger and Instagram messages and ignores echoes', () => {
    const body = (object: string) => ({
      object,
      entry: [
        {
          id: 'acct1',
          messaging: [
            { sender: { id: 'u1' }, recipient: { id: 'acct1' }, timestamp: 1700000000000, message: { mid: 'm1', text: 'hi' } },
            { sender: { id: 'acct1' }, timestamp: 1700000000001, message: { mid: 'm2', text: 'ours', is_echo: true } },
            { sender: { id: 'u1' }, timestamp: 1700000000002, message: { mid: 'm3', attachments: [{ type: 'image' }] } },
            { sender: { id: 'u1' }, timestamp: 1700000000003, read: { watermark: 1 } },
          ],
        },
      ],
    });
    const messenger = parseMetaPayload(body('page'));
    expect(messenger.map((e) => e.key)).toEqual(['messenger:message:m1', 'messenger:message:m3']);
    expect(messenger[0]).toMatchObject({ accountId: 'acct1', message: { from: 'u1', type: 'text', text: 'hi' } });
    expect(messenger[1]).toMatchObject({ message: { type: 'image' } });
    expect(parseMetaPayload(body('instagram'))[0]?.key).toBe('instagram:message:m1');
  });

  it('never throws on garbage and skips unknown objects', () => {
    for (const bad of [null, 'x', 42, [], {}, { object: 'page' }, { object: 'user', entry: [] }, wa({ nope: true }), { object: 'page', entry: [{ id: 1 }] }]) {
      expect(parseMetaPayload(bad)).toEqual([]);
    }
  });
});
