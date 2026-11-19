# 0.2.1

- Temperaturgraph erhält vor dem Nachladen einen festen Platz vor dem Heizungsbereich.
- Heizspalten und native Unterkarten auf die verfügbare Breite begrenzt; Thermostate erhalten wieder 248 px Höhe.
- Zusätzlicher Regressionstest für Graphposition nach asynchronem Laden.
- Live-Austausch von 0.2.0 wegen Darstellungsfehlern zurückgenommen; bestehende Heizbereiche wiederhergestellt.

# 0.2.0

- Neue Heating Control Card: bis zu zwei Fenster, Raumtemperatur/-feuchte, nativer Statistikgraph, bis zu zwei native Thermostate mit jeweils zugeordnetem PI Heating Demand.
- Separate Fan Control Card: An/Aus, Geschwindigkeit und optionaler Lock-Schalter, über GUI konfigurierbar.
- Native HA-Unterkarten bleiben bei Zustandsänderungen stabil; keine wiederholten Dashboard-Templates nötig.
- Bestehende Room Control Card unverändert. Kein automatischer Austausch bestehender Dashboard-Konfigurationen.
- 32 bestehende und sechs neue Funktionstests bestanden. Live-Prüfung nach Installation ausstehend.

# Changelog

## 0.1.4

- Behält ha-card und den Shadow-Root-Inhalt für externe Stile dauerhaft bei.
- Zustandsänderungen und Bedienaktionen ersetzen nur noch den eigenen Inhaltscontainer.
- Verhindert dadurch den Verlust von card-mod-Stilen und ihrer Template-Anbindung, etwa bei Anwesenheitsfarben oder Sichtbarkeitsregeln.
- Persönliche Farb-/Sichtbarkeitsregeln bleiben unverändert in der Dashboard-Konfiguration.
- Regressionstests für wiederholte Sensorupdates, Konfigurationsänderungen und Serviceaktionen.


## 0.1.3

- Companion-App bei maximal 600 px: Überschrift oben, Subbuttons darunter über volle Breite, gleichmäßige Buttons mit mindestens 38 px Höhe, keine Kopf-Trennlinie.
- Geräteaktionen einschließlich Dienstaufrufen und lokaler Navigation im nativen HA-Aktionseditor.
- Unabhängige Tipp- und Halteaktionen für Geräteicons, ohne verschachtelte Buttons.
- Optionale Subbutton-Farbregeln nach Entitätszustand mit Farbauswahl und Deckkraft im Editor.
- Eigene Statustexte für Geräte und Sensoren im Editor; Bewegungs-/Rauch-/Türsensoren berücksichtigen ihre device_class.
- Bisherige Aktionskurzformen bleiben kompatibel; card-mod und persönliche Zuordnungen bleiben erhalten.
- Unbeteiligte HA-Zustandsänderungen unterbrechen keine Halteaktionen mehr.


## 0.1.2

- Native HA-Icon-Auswahl mit Suche und Vorschau für Kartenkopf, Geräte, Statusfelder und Subbuttons.
- Optionale Subbuttons im Kartenkopf mit aufklappbarem Editor, Sortierung und Entfernen.
- Hintergrundfarbe, Deckkraft und Schrift-/Iconfarbe je Subbutton.
- Native HA-Aktionsauswahl für Tippen und Halten: keine Aktion, Details, Umschalten oder Aktion ausführen.
- Script-Entitäten erhalten als Vorbelegung script.turn_on; bestehende Geräte-/Statuskonfiguration bleibt erhalten.

## 0.1.1

- Standarddarstellung an die vorhandenen Raumkarten angepasst: Verlauf, 24-px-Rahmen, Titel mit Trennlinie, kompakte Geräte- und Statuskacheln.
- Geräte mit Icon-Hintergrund, Lichtzustände goldfarben und andere aktive Geräte blau; aktive Statusanzeigen grün.
- Helligkeit eingeschalteter Lampen als Prozentwert.
- Einstellungen pro Gerät und Statusfeld aufklappbar; Name und Entität bleiben in der Übersicht sichtbar.
- Bestehende Konfiguration, Aktionen und card-mod bleiben erhalten.

## 0.1.0

- Raum-/Abschnittsname und optionales Icon.
- Geräte und reine Status-/Sensoranzeigen in einer Karte.
- Visueller Editor zum Auswählen, Beschriften, Sortieren und Entfernen.
- Pro Element im Editor wählbare Tipp- und Halteaktionen mit passenden Vorgaben.
- Umschalten unterstützter Entitäten oder Öffnen der HA-Details; Statusfelder schalten niemals.
- Themevariablen und gezielte Ansatzpunkte für card-mod.
- Ohne Subbuttons und ohne externe Kartenabhängigkeiten.
