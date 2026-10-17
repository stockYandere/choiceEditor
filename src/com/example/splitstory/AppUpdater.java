package com.example.splitstory;
import android.app.PendingIntent;import android.content.*;import android.content.pm.*;import android.os.*;import org.json.JSONObject;import java.io.*;import java.net.*;import java.security.MessageDigest;import java.security.cert.X509Certificate;import java.util.*;
/** Editor self-update: reads release/update.json from the public repository, downloads the APK, accepts it only when it is
 * this app, newer and signed with this install's key, then installs it through PackageInstaller. */
final class AppUpdater {
static final String BASE="https://raw.githubusercontent.com/stockYandere/choiceEditor/HEAD/release/",FEED=BASE+"update.json";
static final long CHECK_EVERY=60*60*1000L;static final int MAX_APK=60000000;
final MainActivity activity;final SharedPreferences prefs;volatile boolean checking,installing;volatile File ready;volatile int readyCode;volatile String readyName="",notes="",error="";
AppUpdater(MainActivity a){activity=a;prefs=a.getSharedPreferences("app-update",0);}
boolean enabled(){return prefs.getBoolean("auto",true);}
void setEnabled(boolean v){prefs.edit().putBoolean("auto",v).apply();if(v)check(true);else notifyJs();}
PackageInfo self()throws Exception{return activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);}
boolean canInstall(){return Build.VERSION.SDK_INT<26||activity.getPackageManager().canRequestPackageInstalls();}
// Android 12+ installs without asking once this app is the installer of record (after its first self-update).
boolean silentPossible(){if(Build.VERSION.SDK_INT<31)return false;try{return activity.getPackageName().equals(activity.getPackageManager().getInstallSourceInfo(activity.getPackageName()).getInstallingPackageName());}catch(Exception e){return false;}}
String status(){try{JSONObject j=new JSONObject();PackageInfo p=self();j.put("enabled",enabled());j.put("current",p.versionName);j.put("currentCode",p.versionCode);j.put("checking",checking);j.put("installing",installing);j.put("ready",ready!=null);j.put("readyName",readyName);j.put("notes",notes);j.put("canInstall",canInstall());j.put("silent",silentPossible());j.put("lastCheck",prefs.getLong("last",0));j.put("error",error.isEmpty()?prefs.getString("installError",""):error);return j.toString();}catch(Exception e){return "{}";}}
void notifyJs(){final String s=status();activity.runOnUiThread(()->{if(activity.web!=null)activity.web.evaluateJavascript("window.onAppUpdate && window.onAppUpdate("+s+")",null);});}

void check(boolean force){if(!force&&(!enabled()||System.currentTimeMillis()-prefs.getLong("last",0)<CHECK_EVERY))return;if(checking||installing)return;checking=true;error="";notifyJs();
 new Thread(()->{try{JSONObject j=new JSONObject(new String(get(FEED,200000),"UTF-8"));prefs.edit().putLong("last",System.currentTimeMillis()).apply();int code=j.getInt("versionCode");
  if(code<=self().versionCode){ready=null;cleanup(-1);return;}
  String name=j.getString("apk");if(!name.matches("[A-Za-z0-9._-]{1,80}\\.apk"))throw new IOException("업데이트 파일 이름");File apk=new File(activity.getCacheDir(),"editor-update-"+code+".apk");
  if(!(apk.isFile()&&accept(apk,code,j.optString("sha256")))){cleanup(code);byte[] bytes=get(BASE+name,MAX_APK);try(FileOutputStream out=new FileOutputStream(apk)){out.write(bytes);}if(!accept(apk,code,j.optString("sha256"))){apk.delete();throw new IOException("받은 업데이트를 확인하지 못했습니다.");}}
  ready=apk;readyCode=code;readyName=j.optString("versionName",String.valueOf(code));notes=j.optString("notes","");prefs.edit().remove("installError").apply();
 }catch(Exception e){error=e.getMessage()==null?"업데이트 확인 실패":e.getMessage();}finally{checking=false;notifyJs();}},"EditorUpdateCheck").start();}

static byte[] get(String url,int max)throws IOException{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setConnectTimeout(15000);c.setReadTimeout(60000);c.setInstanceFollowRedirects(true);c.setRequestProperty("Cache-Control","no-cache");
 try{if(c.getResponseCode()!=200)throw new IOException("업데이트 서버 응답 "+c.getResponseCode());try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){if(out.size()+n>max)throw new IOException("업데이트 크기 제한");out.write(b,0,n);}return out.toByteArray();}}finally{c.disconnect();}}
void cleanup(int keep){File[] fs=activity.getCacheDir().listFiles((d,n)->n.startsWith("editor-update-")&&n.endsWith(".apk"));if(fs!=null)for(File f:fs)if(!f.getName().equals("editor-update-"+keep+".apk"))f.delete();}
static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte x:b)s.append(String.format(Locale.ROOT,"%02x",x&255));return s.toString();}
// Same package, the announced newer version, matching checksum, and signed by the key that signed this install.
boolean accept(File apk,int code,String sha)throws Exception{if(!sha.isEmpty()){MessageDigest d=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(apk)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)d.update(b,0,n);}if(!hex(d.digest()).equalsIgnoreCase(sha))return false;}
 PackageInfo info=activity.getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),0);if(info==null||!activity.getPackageName().equals(info.packageName)||info.versionCode!=code||code<=self().versionCode)return false;
 com.android.apksig.ApkVerifier.Result r=new com.android.apksig.ApkVerifier.Builder(apk).setMinCheckedPlatformVersion(26).build().verify();if(!r.isVerified())return false;Set<String> mine=ownCerts();for(X509Certificate c:r.getSignerCertificates())if(mine.contains(hex(MessageDigest.getInstance("SHA-256").digest(c.getEncoded()))))return true;return false;}
@SuppressWarnings("deprecation") Set<String> ownCerts()throws Exception{Set<String> out=new HashSet<>();PackageManager pm=activity.getPackageManager();android.content.pm.Signature[] sigs;
 if(Build.VERSION.SDK_INT>=28){PackageInfo p=pm.getPackageInfo(activity.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);sigs=p.signingInfo.getApkContentsSigners();}else sigs=pm.getPackageInfo(activity.getPackageName(),PackageManager.GET_SIGNATURES).signatures;
 for(android.content.pm.Signature s:sigs)out.add(hex(MessageDigest.getInstance("SHA-256").digest(s.toByteArray())));return out;}

// userVisible: the editor is on screen, so Android may show its one-time confirmation.
void install(boolean userVisible){final File apk=ready;if(apk==null||installing)return;if(!canInstall()){if(userVisible)openInstallSettings();return;}installing=true;notifyJs();
 new Thread(()->{try{PackageInstaller pi=activity.getPackageManager().getPackageInstaller();PackageInstaller.SessionParams p=new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);p.setAppPackageName(activity.getPackageName());if(Build.VERSION.SDK_INT>=31)p.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
  int id=pi.createSession(p);try(PackageInstaller.Session s=pi.openSession(id)){try(OutputStream out=s.openWrite("base.apk",0,apk.length());InputStream in=new FileInputStream(apk)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)out.write(b,0,n);s.fsync(out);}
   Intent cb=new Intent(activity,UpdateReceiver.class).setPackage(activity.getPackageName()).putExtra("visible",userVisible);int flags=PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=31?PendingIntent.FLAG_MUTABLE:0);s.commit(PendingIntent.getBroadcast(activity,id,cb,flags).getIntentSender());}
 }catch(Exception e){installing=false;prefs.edit().putString("installError",e.getMessage()==null?"설치 실패":e.getMessage()).apply();notifyJs();}},"EditorUpdateInstall").start();}
void openInstallSettings(){activity.runOnUiThread(()->{try{activity.startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,android.net.Uri.parse("package:"+activity.getPackageName())));}catch(Exception e){}});}
}
