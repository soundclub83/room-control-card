# Room Control Card

Eine Home-Assistant-Dashboard-Karte für einen Raum oder Abschnitt: **Name, Geräte und Status / Sensoren gemeinsam in einer Karte**, mit visuellem Editor. Version 0.1.2. Optionale Subbuttons im Kartenkopf, kein zusätzliches Theme und keine fest eingebauten persönlichen Entitäten.

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
- Pro Element die Aktion beim Tippen und beim Halten getrennt einstellen. Vorgabe für Licht, Schalter und Eingabe-Schalter: Tippen schaltet, Halten öffnet Details. Andere Geräte öffnen per Vorgabe Details. Ventilatoren lassen sich optional ebenfalls auf Umschalten stellen. „Keine Aktion“ ist immer wählbar. Halten entspricht 500 ms; per Tastatur ist die Halteaktion auch mit Umschalt+F10 erreichbar.
- Status / Sensoren schalten niemals. Tippen öffnet standardmäßig Details, Halten hat keine Aktion; beides lässt sich zwischen „Details öffnen“ und „Keine Aktion“ umstellen. Auch eine Geräteentität kann hier als Status angezeigt werden.

Alle Bereiche sind optional. Die Geräteauswahl bleibt bewusst offen: Nicht jede bedienbare Entität gehört einer Schalter-Domäne an. Die erlaubten direkten Schaltaktionen werden zusätzlich im Code geprüft. Nicht verfügbare Entitäten sind nicht bedienbar. Fehler bei Schaltaktionen werden auf der Karte angezeigt.

## Subbuttons

Im Editor unter „Subbuttons“ einen Button hinzufügen. Jeder Button hat einen aufklappbaren Eintrag mit Name, optionaler Entität, Icon, Hintergrundfarbe, Hintergrunddeckkraft und Schrift-/Iconfarbe. Ohne Name wird bei einem gewählten Icon nur das Icon angezeigt; ohne beides wird der Entitätsname verwendet. Über „Nach oben“, „Nach unten“ und „Entfernen“ verwalten.

Die native HA-Aktionsauswahl konfiguriert Tippen und Halten einschließlich Ziel und Daten bei „Aktion ausführen“. Unterstützt: `none`, `more-info`, `toggle`, `perform-action`. Details und Umschalten benötigen eine passende Entität; Script-Aufrufe werden über „Aktion ausführen“ eingestellt. Bestätigungen für Schalt-/Dienstaktionen werden berücksichtigt.

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

Farben werden als `#RRGGBB` gespeichert, die Deckkraft separat zwischen 0 und 1 (im Editor 0–100 %). Ohne Subbuttons bleibt der bisherige Aufbau erhalten. Die Farben sind fest pro Button einstellbar; zustandsabhängige Farbregeln sind noch nicht enthalten.

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

Die optionalen Felder `action` und `hold_action` steuern Tippen und Halten. In Listen sind auch einfache Entitäts-IDs statt Objekten erlaubt. Geräteaktionen: `toggle`, `more-info`, `none`. Statusfelder erlauben `more-info` oder `none`, keine Schaltaktionen. Dienstaufrufe sind bei Subbuttons verfügbar. Geräte-/Statusfelder behalten ihre bisherige Aktionsauswahl. Navigation und automatische Migration bestehender Spezialaktionen sind nicht enthalten. Bestehende zusätzliche Konfigurationsfelder wie `card_mod` bleiben beim Bearbeiten erhalten.

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

Die Tests prüfen getrennte Rollen, Konfigurationsvalidierung, Schaltziele, Fehlersituationen sowie Hinzufügen, Sortieren und Entfernen im Editor. Sie ersetzen keinen Test von Darstellung und Editor in einer echten HA-Installation. Version 0.1.0 wurde vom Nutzer in HA installiert und im Editor konfiguriert. Design und aufklappbare Einträge von 0.1.1 wurden vom Nutzer in HA bestätigt. Icon-Auswahl und Subbuttons von 0.1.2 müssen noch in HA geprüft werden.

Orientiert an der offiziellen [Custom-Card-Schnittstelle](https://contributors.home-assistant.io/frontend/custom-ui/card/) und dem [Karteneditor-Vertrag](https://contributors.home-assistant.io/frontend/custom-ui/card-editor/). Der Editor kombiniert eigene HTML-Bedienelemente mit HA-Formularen und nativen Selektoren für Icons, Entitäten und Subbutton-Aktionen. Keine zusätzlichen Bibliotheken. Änderungen an den HA-Selektoren können Anpassungen erfordern.

## Lizenz

MIT, Copyright (c) 2026 soundclub83. Siehe [LICENSE](LICENSE).
