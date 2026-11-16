# Room Control Card

Eine Home-Assistant-Dashboard-Karte für einen Raum oder Abschnitt: **Name, Geräte und Status / Sensoren gemeinsam in einer Karte**, mit visuellem Editor. Erste Version 0.1.0. Keine Subbuttons, kein zusätzliches Theme und keine fest eingebauten persönlichen Entitäten.

## Installation über den Marketplace

Dieses Repository als benutzerdefiniertes Dashboard-Repository hinzufügen:

https://github.com/soundclub83/room-control-card

Anschließend installieren und die Dashboard-Seite aktualisieren. Die Datei heißt **room-control-card.js**, der Kartentyp bleibt **custom:room-control-card**. Keine weiteren Karten oder Bibliotheken erforderlich.

Im Dashboard-Editor „Karte hinzufügen“ → „Room Control Card“ auswählen. Ein bestehendes Dashboard wird durch die Installation nicht verändert.

## Visueller Editor

- Raum-/Abschnittsname und optionales Icon einstellen.
- In „Geräte“ beziehungsweise „Status / Sensoren“ eine Entität über „Entität hinzufügen“ auswählen. Das Suchfeld bietet Entitäts-IDs mit Anzeigenamen an; die Auswahl wird beim Übernehmen des Feldes hinzugefügt.
- Anzeigenamen und Icons bei Bedarf überschreiben; leere Felder verwenden die Entitätsvorgaben.
- Innerhalb beider Bereiche über „Nach oben“ und „Nach unten“ sortieren oder Elemente entfernen.
- Pro Element die Aktion beim Tippen und beim Halten getrennt einstellen. Vorgabe für Licht, Schalter und Eingabe-Schalter: Tippen schaltet, Halten öffnet Details. Andere Geräte öffnen per Vorgabe Details. Ventilatoren lassen sich optional ebenfalls auf Umschalten stellen. „Keine Aktion“ ist immer wählbar. Halten entspricht 500 ms; per Tastatur ist die Halteaktion auch mit Umschalt+F10 erreichbar.
- Status / Sensoren schalten niemals. Tippen öffnet standardmäßig Details, Halten hat keine Aktion; beides lässt sich zwischen „Details öffnen“ und „Keine Aktion“ umstellen. Auch eine Geräteentität kann hier als Status angezeigt werden.

Alle Bereiche sind optional. Die Geräteauswahl bleibt bewusst offen: Nicht jede bedienbare Entität gehört einer Schalter-Domäne an. Die erlaubten direkten Schaltaktionen werden zusätzlich im Code geprüft. Nicht verfügbare Entitäten sind nicht bedienbar. Fehler bei Schaltaktionen werden auf der Karte angezeigt.

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

Die optionalen Felder `action` und `hold_action` steuern Tippen und Halten. In Listen sind auch einfache Entitäts-IDs statt Objekten erlaubt. Geräteaktionen: `toggle`, `more-info`, `none`. Statusfelder erlauben `more-info` oder `none`, keine Schaltaktionen. Spezielle Dienstaufrufe, Navigation und Subbuttons gehören noch nicht zu dieser ersten Version; bestehende Spezialaktionen werden nicht automatisch migriert. Bestehende zusätzliche Konfigurationsfelder wie `card_mod` bleiben beim Bearbeiten erhalten.

## Theme und card-mod

Das grundlegende Layout verwendet Home-Assistant-Themefarben. Ein separates persönliches Theme ist noch nicht enthalten. Für spätere Gestaltung stehen diese CSS-Variablen bereit:

`--room-control-background`, `--room-control-radius`, `--room-control-padding`, `--room-control-title-size`, `--room-control-gap`, `--room-control-item-background`, `--room-control-item-radius`, `--room-control-active-color`.

Stabile Klassen im Shadow DOM: `.header`, `.title`, `.devices`, `.device`, `.statuses`, `.status`, `.section-title`, `.icon`, `.name`, `.state`. Außerdem CSS-Parts `header`, `devices`, `device`, `statuses`, `status`. So kann card-mod ergänzen, ohne die visuelle Konfiguration zu ersetzen.

## Entwicklung und Prüfungen

Die auslieferbare JavaScript-Datei liegt direkt im Repository. Kein Build und keine Paketabhängigkeiten. Node.js 22 oder neuer:

```sh
npm run check
npm test
```

Die Tests prüfen getrennte Rollen, Konfigurationsvalidierung, Schaltziele, Fehlersituationen sowie Hinzufügen, Sortieren und Entfernen im Editor. Sie ersetzen keinen Test von Darstellung und Editor in einer echten HA-Installation. Die erste Version wurde noch nicht im laufenden Home Assistant visuell abgenommen.

Orientiert an der offiziellen [Custom-Card-Schnittstelle](https://contributors.home-assistant.io/frontend/custom-ui/card/) und dem [Karteneditor-Vertrag](https://contributors.home-assistant.io/frontend/custom-ui/card-editor/). Der Editor verwendet eigene HTML-Bedienelemente statt zusätzlicher Bibliotheken.

## Lizenz

MIT, Copyright (c) 2026 soundclub83. Siehe [LICENSE](LICENSE).
