package com.example.splitstory;
import android.app.*;import android.os.*;import android.webkit.*;import android.view.*;import android.widget.*;import android.graphics.Color;import java.io.*;import java.nio.charset.StandardCharsets;
/** Standalone game host: no authoring, import or export bridge. */
public class PlayerActivity extends Activity {
WebView web;
@Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.rgb(16,23,33));getWindow().setNavigationBarColor(Color.rgb(16,23,33));LinearLayout root=new LinearLayout(this);root.setBackgroundColor(Color.rgb(16,23,33));root.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i.consumeSystemWindowInsets();});web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,-1));setContentView(root);root.requestApplyInsets();web.setBackgroundColor(Color.rgb(16,23,33));WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setMediaPlaybackRequiresUserGesture(false);web.addJavascriptInterface(new Bridge(),"Android");web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith("file:///android_asset/");}});web.setWebChromeClient(new WebChromeClient(){@Override public boolean onJsConfirm(WebView v,String u,String m,JsResult r){new AlertDialog.Builder(PlayerActivity.this).setMessage(m).setPositiveButton("확인",(d,w)->r.confirm()).setNegativeButton("취소",(d,w)->r.cancel()).setOnCancelListener(d->r.cancel()).show();return true;}});web.loadUrl("file:///android_asset/index.html");if(Build.VERSION.SDK_INT>=33)ModernBack.register(this);}
class Bridge {
final PartitionStore content=new PartitionStore(getFilesDir());
@JavascriptInterface public String readChunk(String id){return content.readChunk(id);}
@JavascriptInterface public boolean saveChunks(String raw){return content.saveChunks(raw);}
@JavascriptInterface public boolean pruneChunks(String raw){return content.pruneChunks(raw);}
@JavascriptInterface public String readGame(){try{return new String(ApkData.read(getAssets().open("game.json"),50000000),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
@JavascriptInterface public synchronized String readData(){File f=new File(getFilesDir(),"project.json");if(!f.exists())return "";try{return new String(java.nio.file.Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8);}catch(Exception e){return "!READ_ERROR";}}
@JavascriptInterface public synchronized String readBackup(){try{return new String(java.nio.file.Files.readAllBytes(new File(getFilesDir(),"project.backup.json").toPath()),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
@JavascriptInterface public synchronized boolean archiveCorrupt(){try{File f=new File(getFilesDir(),"project.json");if(f.exists())java.nio.file.Files.move(f.toPath(),new File(getFilesDir(),"project.corrupt."+System.currentTimeMillis()+".json").toPath());return true;}catch(Exception e){return false;}}
@JavascriptInterface public synchronized boolean saveData(String s){return content.saveIndex(s);}
@JavascriptInterface public void finishGame(){runOnUiThread(()->finish());}
}
@Override public void onBackPressed(){handleBack();}
long backTime;
void handleBack(){web.evaluateJavascript("window.appBack ? window.appBack() : 'EXIT'",v->{if(v!=null&&v.contains("HANDLED"))return;long now=System.currentTimeMillis();if(now-backTime<2000)finish();else{backTime=now;Toast.makeText(this,"뒤로 한 번 더 누르면 종료합니다",Toast.LENGTH_SHORT).show();}});}
static class ModernBack {@android.annotation.TargetApi(33) static void register(PlayerActivity a){a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,a::handleBack);}}
@Override protected void onPause(){if(web!=null)web.evaluateJavascript("window.GameAudio && GameAudio.suspend();window.clearEffects && clearEffects();window.finishDialogue && finishDialogue();window.flushPersist && window.flushPersist()",null);super.onPause();}
@Override protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("window.GameAudio && GameAudio.resume()",null);}
@Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
static class ApkData {static byte[] read(InputStream in,int max)throws IOException{try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[32768];int n;while((n=source.read(buf))!=-1){if(out.size()+n>max)throw new IOException("크기 제한");out.write(buf,0,n);}return out.toByteArray();}}}
}
