package com.example.splitstory;
import android.content.*;import android.content.pm.PackageInstaller;
/** Result of an editor self-update session. A one-time confirmation is shown only when the editor was on screen. */
public class UpdateReceiver extends BroadcastReceiver {
@Override public void onReceive(Context c,Intent i){int status=i.getIntExtra(PackageInstaller.EXTRA_STATUS,PackageInstaller.STATUS_FAILURE);SharedPreferences prefs=c.getSharedPreferences("app-update",0);
 if(status==PackageInstaller.STATUS_PENDING_USER_ACTION){Intent confirm=i.getParcelableExtra(Intent.EXTRA_INTENT);if(confirm!=null&&i.getBooleanExtra("visible",false)){confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);try{c.startActivity(confirm);return;}catch(Exception e){}}prefs.edit().putString("installError","업데이트를 한 번 직접 확인해 주세요. 앱 첫 화면의 '지금 업데이트'를 누르면 됩니다.").putBoolean("needsTap",true).apply();return;}
 if(status!=PackageInstaller.STATUS_SUCCESS){String m=i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);prefs.edit().putString("installError","업데이트 설치 실패"+(m==null?"":" · "+m)).apply();}}
}
