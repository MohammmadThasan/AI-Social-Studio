
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

// Allow App ID to be set dynamically if not present in env
let activeAppId = process.env.FACEBOOK_APP_ID || '';

export const setFacebookAppId = (id: string) => {
  activeAppId = id;
};

export const hasFacebookAppId = () => {
  return !!activeAppId;
};

/**
 * Initialize the Facebook JS SDK
 */
export const initFacebookSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      // If the SDK is loaded, ensure it's initialized with our App ID if we have one
      if (activeAppId) {
        try {
            window.FB.init({
                appId      : activeAppId,
                cookie     : true,
                xfbml      : true,
                version    : 'v19.0'
            });
        } catch (e) {
            // It might already be initialized, which is fine
            console.warn("FB Init warning (safe to ignore if already initialized):", e);
        }
      }
      resolve();
      return;
    }

    window.fbAsyncInit = function() {
      // If we don't have an ID yet, we can't properly init for login
      // But we must resolve so the app doesn't hang.
      if (!activeAppId) {
        console.log("Facebook SDK loaded, waiting for App ID...");
        resolve(); 
        return;
      }
      
      try {
        window.FB.init({
            appId      : activeAppId,
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
        });
        resolve();
      } catch (e) {
        console.warn("FB Init failed", e);
        resolve();
      }
    };

    // Load the SDK asynchronously
    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       // @ts-ignore
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       // @ts-ignore
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  });
};

/**
 * Check if user is already logged in (for automated session restoration)
 */
export const checkLoginStatus = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!window.FB) return reject("FB not loaded");
      
      // If no App ID is set, we can't check status reliably against an app
      if (!activeAppId) return reject("No App ID");

      window.FB.getLoginStatus((response: any) => {
        if (response.status === 'connected') {
          resolve(response.authResponse);
        } else {
          reject("Not connected");
        }
      });
    });
  };

/**
 * Login to Facebook requesting pages permissions
 */
export const loginToFacebook = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
        if (!document.getElementById('facebook-jssdk')) {
            return reject("Facebook SDK not loaded");
        }
    }

    if (!activeAppId) return reject("Facebook App ID is missing. Please enter it to proceed.");

    // Ensure init was called with the ID if it wasn't before
    // Note: Re-calling init with the same ID is safe.
    try {
        window.FB.init({
            appId      : activeAppId,
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
        });
    } catch (e) {
        console.warn("FB Re-init warning", e);
    }

    window.FB.login((response: any) => {
      if (response.authResponse) {
        resolve(response.authResponse);
      } else {
        reject("User cancelled login or did not fully authorize.");
      }
    }, { scope: 'pages_show_list,pages_manage_posts,pages_read_engagement' }); 
  });
};

/**
 * Get the current user's info
 */
export const getFacebookUser = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    window.FB.api('/me', { fields: 'name,id,picture' }, (response: any) => {
      if (!response || response.error) {
        reject(response?.error || 'Failed to fetch user');
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Get list of pages the user manages
 */
export const getFacebookPages = (userId: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    // Explicitly request access_token to ensure we can publish
    window.FB.api(`/${userId}/accounts`, { fields: 'name,access_token,id,category' }, (response: any) => {
      if (!response || response.error) {
        reject(response?.error || 'Failed to fetch pages');
      } else {
        resolve(response.data);
      }
    });
  });
};

/**
 * Publish text content to a specific page
 */
export const publishToFacebookPage = (pageId: string, pageAccessToken: string, message: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    window.FB.api(
      `/${pageId}/feed`,
      'POST',
      { message: message, access_token: pageAccessToken },
      (response: any) => {
        if (!response || response.error) {
          reject(response?.error || 'Failed to publish post');
        } else {
          resolve(response);
        }
      }
    );
  });
};
