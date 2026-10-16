package com.example.splitstory;
import java.io.*;import java.security.*;import java.security.cert.X509Certificate;
public class NativeExportHost {
public static void main(String[] args)throws Exception{KeyStore ks=KeyStore.getInstance("JKS");try(InputStream in=new FileInputStream("signing.jks")){ks.load(in,"event-vn-test".toCharArray());}PrivateKey key=(PrivateKey)ks.getKey("eventvn","event-vn-test".toCharArray());X509Certificate cert=(X509Certificate)ks.getCertificate("eventvn");File folder=new File("export-qa/work");folder.mkdirs();String pkg=ApkExportEngine.packageName(args[2],cert);ApkExportEngine.build(new File("assets/player-shell.apk"),new File("v0.1.23-Event-Game-Editor.apk"),new File(args[0]),new File(args[1]),folder,pkg,args[3],Integer.parseInt(args[4]),key,cert,args.length>5?new File(args[5]):null);System.out.println(pkg);}
}
