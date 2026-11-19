# Room Control Card

Eine Home-Assistant-Dashboard-Karte für einen Raum oder Abschnitt: **Name, Geräte und Status / Sensoren gemeinsam in einer Karte**, mit visuellem Editor. Version 0.2.2. Optionale Subbuttons im Kartenkopf, kein zusätzliches Theme und keine fest eingebauten persönlichen Entitäten.

## Installation über den Marketplace

Dieses Repository als benutzerdefiniertes Dashboard-Repository hinzufügen:

https://github.com/soundclub83/room-control-card

Anschließend installieren und die Dashboard-Seite aktualisieren. Die Datei heißt **room-control-card.js**, der Kartentyp bleibt **custom:room-control-card**. Keine weiteren Karten oder Bibliotheken erforderlich.

Im Dashboard-Editor „Karte hinzufügen“ → „Room Control Card“ auswählen. Ein bestehendes Dashboard wird durch die Installation nicht verändert.

## Visueller Editor

- Raum-/Abschnittsname und optionales Icon einstellen. Icons werden über die native HA-Auswahl mit Suche und Vorschau ausgewählt; das gilt auch für Geräte, Statusfelder und Subbuttons.
- In „Geräte“ beziehungsweise „Status / Sensoren“ eine Entität über „Entität hinzufügen“ auswählen. Das Suchfeld bietet Entitäts-IDs mit Anzeigenamen an; die Auswahl wird beim Übernehmen des Feldes hinzugefügt.
- Anzeigenamen und Icons bei Bedarf überschreiben; leere Felder verwenden die Entitätsvorgaben.
- Geräte und Statusfelder erscheinen zunächst als kompakte, zugeklappte Einträge mit Name und Entitäts-ID. Zum Bearbeiten den jeweiligen Eintrag aufklappen.
- Innerhalb beider Bereiche über „Nach oben“ und „Nach unten“ sortieren oder Elemente entfernen.
- Pro Element die Aktion beim Tippen und beim Halten getrennt einstellen. Vorgabe für Licht, Schalter und Eingabe-Schalter: Tippen schaltet, Halten öffnet Details. Andere Geräte öffnen per Vorgabe Details. Ventilatoren lassen sich optional ebenfalls auf Umschalten stellen. Auch „Aktion ausführen“ (z. B. HDMI auswählen) und lokale Navigation sind jetzt über den nativen Aktionseditor wählbar. Geräteicons haben eigene Tipp-/Halteaktionen: standardmäßig Details beim Tippen, keine Aktion beim Halten. „Keine Aktion“ ist immer wählbar. Halten entspricht 500 ms; per Tastatur ist die Halteaktion auch mit Umschalt+F10 erreichbar.
- Status / Sensoren schalten niemals. Tippen öffnet standardmäßig Details, Halten hat keine Aktion; beides lässt sich zwischen „Details öffnen“ und „Keine Aktion“ umstellen. Auch eine Geräteentität kann hier als Status angezeigt werden.

Alle Bereiche sind optional. Die Geräteauswahl bleibt bewusst offen: Nicht jede bedienbare Entität gehört einer Schalter-Domäne an. Die erlaubten direkten Schaltaktionen werden zusätzlich im Code geprüft. Nicht verfügbare Entitäten sind nicht bedienbar. Fehler bei Schaltaktionen werden auf der Karte angezeigt.

## Subbuttons

Im Editor unter „Subbuttons“ einen Button hinzufügen. Jeder Button hat einen aufklappbaren Eintrag mit Name, optionaler Entität, Icon, Hintergrundfarbe, Hintergrunddeckkraft und Schrift-/Iconfarbe. Ohne Name wird bei einem gewählten Icon nur das Icon angezeigt; ohne beides wird der Entitätsname verwendet. Über „Nach oben“, „Nach unten“ und „Entfernen“ verwalten.

Die native HA-Aktionsauswahl konfiguriert Tippen und Halten einschließlich Ziel und Daten bei „Aktion ausführen“. Unterstützt: `none`, `more-info`, `toggle`, `perform-action`, `navigate` (lokale HA-Pfade). Details und Umschalten benötigen eine passende Entität; Script-Aufrufe werden über „Aktion ausführen“ eingestellt. Bestätigungen für Schalt-/Dienstaktionen werden berücksichtigt.

Beim erstmaligen Zuordnen einer Entität: Licht/Schalter/Eingabe-Schalter/Ventilator schalten standardmäßig um, Scripts starten über `script.turn_on`, andere Entitäten öffnen Details. Halten öffnet Details. Bereits angepasste Aktionen bleiben beim Wechsel einer zugeordneten Entität erhalten; ggf. zuerst eine damit kompatible Aktion wählen.

YAML-Ergänzung zu einer Karte (Beispiel-Entität ersetzen):

```yaml
subbuttons:
  - name: AUTO
    entity: script.raum_automatik
    icon: mdi:auto-mode
    background_color: "#ffaa50"
    background_opacity: 0.28
    text_color: "#ffb366"
    tap_action:
      action: perform-action
      perform_action: script.turn_on
      target:
        entity_id: script.raum_automatik
    hold_action:
      action: more-info
```

Farben werden als `#RRGGBB` gespeichert, die Deckkraft separat zwischen 0 und 1 (im Editor 0–100 %). Ohne Subbuttons bleibt der bisherige Aufbau erhalten. Unter „Farben nach Zustand“ können zusätzlich Regeln für exakte Entitätszustände ergänzt werden. Die erste passende Regel überschreibt die angegebenen Grundfarben; ohne Treffer gelten die Grundfarben. Keine persönlichen Entitäten sind im Kartencode hinterlegt.

Beispiel für einen LOCK-Subbutton: Grundfarbe grün, bei `on` rot:

```yaml
state_colors:
  - state: "on"
    background_color: "#dc2d2d"
    background_opacity: 0.85
    text_color: "#d5dee6"
```

## Companion-App

Auf Displays bis 600 px Breite erkennt die Karte die HA-Companion-Brücke (iOS/Android). Icon und Raumname stehen oben, Subbuttons darunter über volle Breite. Die Buttons verteilen sich gleichmäßig, haben mindestens 38 px Höhe und 12 px Rundung. Die Kopf-Trennlinie ist ausgeblendet. Auf dem Desktop bleibt die kompakte Kopfzeile erhalten. Dafür muss keine persönliche Konfiguration ergänzt werden.

## Geräteaktionen, Icon-Aktionen und Statustexte

Die Felder `action` und `hold_action` bleiben mit bisherigen Kurzformen wie `toggle` kompatibel. Für vollständige HA-Aktionen kann ein Objekt eingetragen werden; der visuelle Editor erzeugt diese Objekte automatisch. Beispiel:

```yaml
action:
  action: perform-action
  perform_action: media_player.select_source
  target:
    entity_id: media_player.fernseher
  data:
    source: HDMI
icon_action: more-info
icon_hold_action: none
```

`icon_action` und `icon_hold_action` gelten nur für Geräte und werden ebenfalls im Editor ausgewählt. Icon und Hauptfläche sind getrennte Buttons. Statusfelder bleiben auf „Details“ oder „Keine Aktion“ beschränkt.

Unter „Eigene Statustexte“ können je Element Zustände mit Anzeigetexten ergänzt werden, beispielsweise:

```yaml
state_labels:
  "on": Erkannt
  "off": Frei
```

Dies ändert ausschließlich die Anzeige, niemals den HA-Zustand. Ohne eigene Zuordnung verwendet die Karte für bekannte Bewegungs-, Rauch- und Tür-device_classes passende Texte; ansonsten die HA-Formatierung. Für Smoke kann z. B. `on: Alarm`, `off: Normal` explizit gesetzt werden.

## YAML-Beispiel

Die Beispiel-Entitäten durch eigene ersetzen:

```yaml
type: custom:room-control-card
name: Wohnzimmer
icon: mdi:sofa
devices:
  - entity: light.wohnzimmer
    name: Decke
    action: toggle
  - entity: media_player.wohnzimmer
    name: Fernseher
    action: more-info
statuses:
  - entity: sensor.wohnzimmer_temperatur
    name: Temperatur
  - entity: binary_sensor.wohnzimmer_bewegung
    name: Bewegung
```

Die optionalen Felder `action` und `hold_action` steuern Tippen und Halten. In Listen sind auch einfache Entitäts-IDs statt Objekten erlaubt. Geräteaktionen: `toggle`, `more-info`, `none`. Statusfelder erlauben `more-info` oder `none`, keine Schaltaktionen. Geräte und Subbuttons unterstützen zusätzlich vollständige Aktionsobjekte mit Dienstaufrufen und lokaler Navigation. Statusfelder bleiben ohne Schaltaktionen. Bestehende Dashboards werden nicht automatisch migriert. Bestehende zusätzliche Konfigurationsfelder wie `card_mod` bleiben beim Bearbeiten erhalten.

## Theme und card-mod

Die Standarddarstellung entspricht dem gemeinsamen Raumkarten-Design: dunkler Verlauf, abgerundeter Rahmen, Titel mit goldener Trennlinie, zweispaltige Geräte und kompakte Statusfelder. Namen bleiben einzeilig mit Auslassung; der vollständige Name kann im Editor geändert werden. Lange Standardnamen werden nicht automatisch umbenannt. Lichtzustände sind goldfarben, andere aktive Geräte blau, Statusnamen türkis und aktive Statuswerte grün. Leuchten zeigen ihre Helligkeit als Prozentwert. Ein separates persönliches Theme ist noch nicht enthalten. Für spätere Gestaltung stehen diese CSS-Variablen bereit:

`--room-control-text`, `--room-control-muted`, `--room-control-header-line`, `--room-control-status-name`, `--room-control-status-active`, `--room-control-background`, `--room-control-radius`, `--room-control-padding`, `--room-control-title-size`, `--room-control-gap`, `--room-control-item-background`, `--room-control-item-radius`, `--room-control-active-color`.

Stabile Klassen im Shadow DOM: `.header`, `.title`, `.devices`, `.device`, `.statuses`, `.status`, `.section-title`, `.icon`, `.name`, `.state`. Außerdem CSS-Parts `subbuttons`, `subbutton`, `header`, `devices`, `device`, `statuses`, `status`. So kann card-mod ergänzen, ohne die visuelle Konfiguration zu ersetzen.

## Entwicklung und Prüfungen

Die auslieferbare JavaScript-Datei liegt direkt im Repository. Kein Build und keine Paketabhängigkeiten. Node.js 22 oder neuer:

```sh
npm run check
npm test
```

Die Tests prüfen getrennte Rollen, Konfigurationsvalidierung, Schaltziele, Fehlersituationen sowie Hinzufügen, Sortieren und Entfernen im Editor. Sie ersetzen keinen Test von Darstellung und Editor in einer echten HA-Installation. Version 0.1.0 wurde vom Nutzer in HA installiert und im Editor konfiguriert. Design und aufklappbare Einträge von 0.1.1 wurden vom Nutzer in HA bestätigt. Icon-Auswahl und Subbuttons von 0.1.2 wurden vom Nutzer in HA angezeigt. Die Ergänzungen von 0.1.3 einschließlich Companion-Layout müssen noch in HA praktisch geprüft werden.

Orientiert an der offiziellen [Custom-Card-Schnittstelle](https://contributors.home-assistant.io/frontend/custom-ui/card/) und dem [Karteneditor-Vertrag](https://contributors.home-assistant.io/frontend/custom-ui/card-editor/). Der Editor kombiniert eigene HTML-Bedienelemente mit HA-Formularen und nativen Selektoren für Icons, Entitäten und Subbutton-Aktionen. Keine zusätzlichen Bibliotheken. Änderungen an den HA-Selektoren können Anpassungen erfordern.

## Lizenz

MIT, Copyright (c) 2026 soundclub83. Siehe [LICENSE](LICENSE).

## card-mod bei Live-Updates

Ab 0.1.4 bleiben das `ha-card`-Element und externe Knoten im Shadow Root bei Zustandsänderungen erhalten. Die Karte ersetzt ausschließlich ihren eigenen `.content`-Container. So werden von card-mod eingefügte Styles und deren Anbindung nicht bei jedem Update entfernt. Persönliche Templates für Raumfarben, Zahlenformatierung und Sichtbarkeit bleiben weiterhin in der Dashboard-Konfiguration.

Für das Update ist keine Änderung der vorhandenen Kartenkonfiguration erforderlich. Nach Installation der neuen Version die Dashboard-Seite einmal neu öffnen, damit der Browser die neue JavaScript-Version verwendet. Ein HA-Neustart ist nicht erforderlich. Der Fix wurde durch automatisierte Regressionstests geprüft; der Praxistest in HA steht nach Installation noch aus.


## Heating Control Card und Fan Control Card (ab 0.2.0)

Beide Kartentypen sind in derselben `room-control-card.js` enthalten. Das bestehende Marketplace-Repository und die vorhandene Ressource bleiben bestehen. Nach Installation des Updates sind beide im Kartenwähler verfügbar. Bestehende Room Control Cards bleiben unverändert.

### Heizung

`custom:heating-control-card` enthält einen Raumkopf, ein oder zwei nebeneinander angeordnete Fensterkontakte, Raumtemperatur und Luftfeuchtigkeit, einen nativen HA-Statistikgraphen sowie ein oder zwei native HA-Thermostate. Der jeweilige PI Heating Demand steht direkt unter seinem Thermostat. Bei einer `number`/`input_number` bleibt der Wert über einen nativen Schieberegler bedienbar; bei einem Sensor wird er angezeigt. Details sind über die native Kachel erreichbar. Thermostate und Graph bleiben bei Zustandsänderungen bestehen.

Im visuellen Editor: Name und Icon, Temperatur-/Feuchtesensor, Diagrammzeitraum und optionale Achsengrenzen einstellen; Fenster und Heizungen einzeln hinzufügen oder entfernen. Pro Heizung ihre PI-Entität auswählen. Ohne zweite Entität nutzt das Element die volle Breite. Fenster und Heizungen sind unabhängig voneinander auf höchstens zwei begrenzt. Leere optionale Felder können entfernt werden.

```yaml
type: custom:heating-control-card
name: Raum
icon: mdi:sofa
windows:
  - entity: binary_sensor.raum_fenster
    name: Fenster
temperature: sensor.raum_temperatur
humidity: sensor.raum_luftfeuchtigkeit
days_to_show: 2
heaters:
  - entity: climate.raum_heizung
    name: Heizung
    demand: number.raum_pi_heating_demand
```

### Lüftung

`custom:fan-control-card` ist eine eigene Karte mit An, Aus, Geschwindigkeitsregler und optionalem Lock-Button. Im visuellen Editor Ventilator und bei Bedarf einen `input_boolean` oder `switch` als Lock-Entität auswählen. Das Entfernen dieser Auswahl blendet Lock aus. Der Lock-Button schaltet ausschließlich diese Entität; er sperrt nicht selbst die Lüfterbedienung und verändert keine vorhandene Automationslogik.

Die Einschaltgeschwindigkeit (Standard 50 %) und eine optionale Voreinstellung sind im Editor einstellbar. Eine Voreinstellung wird nur gesendet, wenn der Ventilator sie meldet; Geschwindigkeit nur bei unterstützter Geschwindigkeitssteuerung. Die Geschwindigkeitsregelung verwendet die native HA-Kachel mit `fan-speed`, optisch passend zur PI-Kachel. Nicht verfügbare Entitäten sind nicht bedienbar, Dienstfehler erscheinen auf der Karte.

```yaml
type: custom:fan-control-card
name: Raum Lüftung
entity: fan.raum
lock_entity: input_boolean.raum_lufter_lock
on_percentage: 50
preset_mode: Normal
```

### Gestaltung und Betrieb

Die wiederkehrende Gestaltung liegt im Kartencode, nicht als wiederholte Dashboard-Templates. Allgemeine Text- und Akzentwerte folgen dem Theme. Lokale CSS-Variablen `climate-control-background`, `climate-control-radius`, `climate-control-item-background` und `climate-control-label` erlauben eigene Anpassungen. `card_mod` kann zusätzlich am stabilen äußeren `ha-card` eingesetzt werden; für die Grundfunktion wird es nicht benötigt. Die beiden neuen Karten benötigen weder Mushroom noch Button Card oder Slider Button Card. Statistikgraph, Thermostate und PI-Kachel sind native HA-Karten. Es gibt keine eigenen Polling-Timer oder serverseitigen Templates.

Das Update verändert keine Dashboard-Konfiguration automatisch. Bestehende Räume erst nach Installation der neuen Version ersetzen und vorher sichern. Pflanzen- und Wetterkarten gehören nicht zu dieser Änderung.

Geprüft: bestehende 32 Tests und sechs neue Tests für Zuordnung/Ladereihenfolge, stabile Elemente, veraltete Ladevorgänge, Aktionen, Fehler, Validierung und Editoränderungen. Live-Darstellung und Gerätebedienung sind erst nach Installation zu prüfen; Tests lösen keine echten Geräteaktionen aus.

Quellen: [HA Custom Cards](https://contributors.home-assistant.io/frontend/custom-ui/card/), [native Kartenfunktionen](https://www.home-assistant.io/dashboards/features/).
