import path from 'path';

/**
 * Katalog główny danych aplikacji.
 * W Railway ustaw PANO_DATA_DIR=/pano-data i zamontuj volume na tej ścieżce.
 * Lokalnie domyślnie: katalog roboczy (./data, ./uploads).
 */
export function getDataRoot(): string {
  const root = process.env.PANO_DATA_DIR?.trim();
  return root ? path.resolve(root) : process.cwd();
}
