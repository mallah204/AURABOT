import { createMessageHelper } from '../message';

// Mock API
const mockAPI = {
  sendMessage: jest.fn((message, threadID, callback) => {
    callback(null);
  }),
  setMessageReaction: jest.fn((emoji, messageID, callback) => {
    callback(null);
  })
};

const mockEvent = {
  threadID: '123',
  messageID: '456',
  senderID: '789'
} as any;

describe('Message Helper', () => {
  test('should create message helper', () => {
    const helper = createMessageHelper(mockAPI as any, mockEvent);
    expect(helper).toHaveProperty('send');
    expect(helper).toHaveProperty('reply');
    expect(helper).toHaveProperty('react');
  });

  test('should send message', async () => {
    const helper = createMessageHelper(mockAPI as any, mockEvent);
    await helper.send('test message');
    expect(mockAPI.sendMessage).toHaveBeenCalled();
  });

  test('should reply to message', async () => {
    const helper = createMessageHelper(mockAPI as any, mockEvent);
    await helper.reply('test reply');
    expect(mockAPI.sendMessage).toHaveBeenCalled();
  });

  test('should react to message', async () => {
    const helper = createMessageHelper(mockAPI as any, mockEvent);
    await helper.react('👍');
    expect(mockAPI.setMessageReaction).toHaveBeenCalled();
  });
});
