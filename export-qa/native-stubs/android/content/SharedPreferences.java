package android.content;
public interface SharedPreferences {boolean contains(String k);int getInt(String k,int d);boolean getBoolean(String k,boolean d);Editor edit();interface Editor{Editor putInt(String k,int v);Editor putBoolean(String k,boolean v);boolean commit();}}
