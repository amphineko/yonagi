import javax.swing.*;
import java.awt.*;
import java.security.KeyStore;

public class Main {
    private static void remakeKeyStore(String filename, String outputFilename, String password) throws Exception {
        var fis = new java.io.FileInputStream(filename);
        var ksIn = KeyStore.getInstance("PKCS12");
        ksIn.load(fis, password.toCharArray());
        fis.close();

        var ksOut = KeyStore.getInstance("PKCS12");
        ksOut.load(null, password.toCharArray());

        var entries = ksIn.aliases();
        while (entries.hasMoreElements()) {
            var alias = entries.nextElement();
            var cert = ksIn.getCertificate(alias);
            ksOut.setCertificateEntry(alias, cert);

            var key = ksIn.getKey(alias, password.toCharArray());
            ksOut.setKeyEntry(alias, key, password.toCharArray(), new java.security.cert.Certificate[]{cert});

            var chain = ksIn.getCertificateChain(alias);
            if (chain != null) {
                ksOut.setKeyEntry(alias, key, password.toCharArray(), chain);
            }
        }

        var fos = new java.io.FileOutputStream(outputFilename);
        ksOut.store(fos, password.toCharArray());
        fos.close();
    }

    public static void main(String[] args) throws Exception {
        SwingUtilities.invokeLater(() -> {
            // select file by dialog
            var fd = new FileDialog(new Frame(), "Choose a file", FileDialog.LOAD);
            fd.setFilenameFilter((dir, name) -> name.endsWith(".p12"));
            fd.setVisible(true);
            var filename = fd.getFiles()[0].getAbsolutePath();

            // assert and create output filename ".out.p12"
            if (!filename.endsWith(".p12")) {
                JOptionPane.showMessageDialog(null, "File must be .p12");
                return;
            }
            var outputFilename = filename.substring(0, filename.length() - 4) + ".out.p12";

            // read password by dialog
            var password = JOptionPane.showInputDialog("Enter password");

            // remake keystore
            try {
                remakeKeyStore(filename, outputFilename, password);
            } catch (Exception e) {
                e.printStackTrace();
                JOptionPane.showMessageDialog(null, e.getMessage());
            }
        });
    }
}