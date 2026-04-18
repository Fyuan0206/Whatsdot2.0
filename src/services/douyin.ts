/**
 * Douyin Service Adapter
 * Provides mocks for the browser environment and real 'tt' calls for the Douyin Mini-game environment.
 */

declare const tt: any;

export const DouyinService = {
  isDouyin: typeof tt !== 'undefined',

  async login(): Promise<{ userId: string; username: string }> {
    if (this.isDouyin) {
      return new Promise((resolve, reject) => {
        tt.login({
          success: (res: any) => {
            // In a real app, you'd exchange this code for a real UID on your backend.
            // For this applet, we'll just mock it or use Firebase Auth.
            resolve({ userId: 'tt_user_' + res.code.slice(0, 8), username: '抖音用户' });
          },
          fail: reject
        });
      });
    } else {
      // Mock login for browser
      return { userId: 'mock_user_123', username: '游客用户' };
    }
  },

  async watchAd(): Promise<boolean> {
    if (this.isDouyin) {
      return new Promise((resolve) => {
        const videoAd = tt.createRewardedVideoAd({
          adUnitId: 'YOUR_AD_UNIT_ID'
        });
        videoAd.show().catch(() => {
          videoAd.load().then(() => videoAd.show());
        });
        videoAd.onClose((res: any) => {
          if (res && res.isEnded || res === undefined) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        videoAd.onError(() => resolve(false));
      });
    } else {
      // Browser mock: Just a 1s delay to simulate an ad
      console.log('【广告模拟】正在观看广告...');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 1500);
      });
    }
  },

  async publishVideo(options: { videoPath?: string; title: string }) {
    if (this.isDouyin) {
      tt.shareVideo({
        videoPath: options.videoPath || '',
        query: 'from=pixel_game',
        title: options.title,
        hashtags: ['我勒个豆'],
        success() {
          console.log('Publish success');
        },
        fail(e: any) {
          console.error('Publish fail', e);
        }
      });
    } else {
      console.log(`【炸裂发豆】已模拟发布视频：${options.title}`);
    }
  },

  async showToast(title: string) {
    if (this.isDouyin) {
      tt.showToast({ title, icon: 'none' });
    } else {
      console.log('Toast:', title);
    }
  }
};
