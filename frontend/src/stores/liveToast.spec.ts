import { useLiveToastStore } from './liveToast';
import type { LiveToastCategory } from './liveToast';

// Reset store between tests
beforeEach(() => {
  useLiveToastStore.setState({ toasts: [] });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useLiveToastStore', () => {
  describe('addToast', () => {
    it('should add a toast to the queue', () => {
      useLiveToastStore.getState().addToast({
        category: 'chat-message',
        title: 'New Message',
        message: 'Hello',
      });

      const toasts = useLiveToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].category).toBe('chat-message');
      expect(toasts[0].title).toBe('New Message');
      expect(toasts[0].message).toBe('Hello');
    });

    it('should assign unique IDs to each toast', () => {
      const { addToast } = useLiveToastStore.getState();
      addToast({ category: 'trade', title: 'A', message: '' });
      addToast({ category: 'trade', title: 'B', message: '' });

      const toasts = useLiveToastStore.getState().toasts;
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it('should auto-dismiss after 4 seconds', () => {
      useLiveToastStore.getState().addToast({
        category: 'announcement-new',
        title: 'Test',
        message: '',
      });

      expect(useLiveToastStore.getState().toasts).toHaveLength(1);

      jest.advanceTimersByTime(4000);

      expect(useLiveToastStore.getState().toasts).toHaveLength(0);
    });

    it('should cap at 5 toasts maximum', () => {
      const { addToast } = useLiveToastStore.getState();
      for (let i = 0; i < 7; i++) {
        addToast({ category: 'trade', title: `Toast ${i}`, message: '' });
      }

      const toasts = useLiveToastStore.getState().toasts;
      expect(toasts).toHaveLength(5);
      // Should keep the latest 5 (indices 2-6)
      expect(toasts[0].title).toBe('Toast 2');
      expect(toasts[4].title).toBe('Toast 6');
    });

    it('should preserve optional fields navigateTo and chatRoomId', () => {
      useLiveToastStore.getState().addToast({
        category: 'chat-message',
        title: 'Msg',
        message: 'Hi',
        navigateTo: '/orders',
        chatRoomId: 'room-1',
      });

      const toast = useLiveToastStore.getState().toasts[0];
      expect(toast.navigateTo).toBe('/orders');
      expect(toast.chatRoomId).toBe('room-1');
    });

    it('should support all 10 categories', () => {
      const categories: LiveToastCategory[] = [
        'chat-message', 'chat-invited', 'chat-kicked',
        'trade', 'price-alert',
        'announcement-new', 'announcement-updated',
        'registration-approved', 'registration-rejected', 'registration-request',
      ];

      // Reset and add one by one to avoid max limit
      for (const cat of categories) {
        useLiveToastStore.setState({ toasts: [] });
        useLiveToastStore.getState().addToast({
          category: cat,
          title: cat,
          message: 'test',
        });
        const toasts = useLiveToastStore.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].category).toBe(cat);
      }
    });
  });

  describe('removeToast', () => {
    it('should remove a specific toast by ID', () => {
      const { addToast } = useLiveToastStore.getState();
      addToast({ category: 'trade', title: 'A', message: '' });
      addToast({ category: 'trade', title: 'B', message: '' });

      const toasts = useLiveToastStore.getState().toasts;
      const idToRemove = toasts[0].id;

      useLiveToastStore.getState().removeToast(idToRemove);

      const remaining = useLiveToastStore.getState().toasts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('B');
    });

    it('should not throw when removing non-existent ID', () => {
      expect(() => {
        useLiveToastStore.getState().removeToast(99999);
      }).not.toThrow();
    });
  });

  describe('auto-dismiss independence', () => {
    it('should dismiss each toast independently', () => {
      const { addToast } = useLiveToastStore.getState();

      addToast({ category: 'trade', title: 'First', message: '' });
      jest.advanceTimersByTime(2000);

      addToast({ category: 'trade', title: 'Second', message: '' });

      // After 2 more seconds, first should be gone
      jest.advanceTimersByTime(2000);
      const toasts = useLiveToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].title).toBe('Second');

      // After 2 more seconds, second should be gone
      jest.advanceTimersByTime(2000);
      expect(useLiveToastStore.getState().toasts).toHaveLength(0);
    });
  });
});
