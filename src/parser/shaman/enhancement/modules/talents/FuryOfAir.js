import React from 'react';
import SPELLS from 'common/SPELLS/index';
import SpellIcon from 'common/SpellIcon';
import { formatPercentage } from 'common/format';

import Analyzer from 'parser/core/Analyzer';

import StatisticBox from 'interface/others/StatisticBox';

const FURY_OF_AIR_MAELSTROM_COST = SPELLS.FURY_OF_AIR_TALENT.maelstrom;
const FURY_ID = SPELLS.FURY_OF_AIR_TALENT.id;

class FuryOfAir extends Analyzer {
  furyUptime = 0;
  maelstromUsed = 0;
  applyTime = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTalent(SPELLS.FURY_OF_AIR_TALENT.id);
  }

  on_byPlayer_applybuff(event) {
    const spellId = event.ability.guid;
    if (spellId === FURY_ID) {
      this.applyTime = event.timestamp;
      this.maelstromUsed += FURY_OF_AIR_MAELSTROM_COST;
    }
  }

  on_removebuff(event) {
    const spellId = event.ability.guid;
    if (spellId === FURY_ID) {
      this.furyUptime += Math.floor((event.timestamp - this.applyTime) / 1000);
      this.applyTime = 0;
    }
  }

  on_fightend() {
    if (this.applyTime !== 0) {
      this.furyUptime += Math.floor((this.owner.fight.end_time - this.applyTime) / 1000);
    }
    this.maelstromUsed = this.furyUptime * FURY_OF_AIR_MAELSTROM_COST;
  }

  suggestions(when) {
    const furyofairUptime = this.selectedCombatant.getBuffUptime(FURY_ID) / this.owner.fightDuration;

    when(furyofairUptime).isLessThan(0.95)
      .addSuggestion((suggest, actual, recommended) => {
        return suggest('Try to make sure the Fury of Air is always up, when it drops you should refresh it as soon as possible')
          .icon(SPELLS.FURY_OF_AIR_TALENT.icon)
          .actual(`${formatPercentage(actual)}% uptime`)
          .recommended(`${(formatPercentage(recommended, 0))}% is recommended`)
          .regular(recommended)
          .major(recommended - 0.05);
      });
  }

  statistic() {
    const furyofairUptime = this.selectedCombatant.getBuffUptime(FURY_ID) / this.owner.fightDuration;
    return (
      <StatisticBox
        icon={<SpellIcon id={FURY_ID} />}
        value={`${formatPercentage(furyofairUptime)} %`}
        label="Fury of Air uptime"
        tooltip="One of your highest priorities, get as close to 100% as possible"
      />
    );
  }
}

export default FuryOfAir;
