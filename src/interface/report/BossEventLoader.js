import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { Trans } from '@lingui/macro';
import ExtendableError from 'es6-error';

import { fetchEvents, LogNotFoundError } from 'common/fetchWclApi';
import { captureException } from 'common/errorLogger';
import makeAnalyzerUrl from 'interface/common/makeAnalyzerUrl';
import { findByBossId } from 'raids';

import Ghuun from './images/Ghuun.gif';
import handleApiError from './handleApiError';
import './EventParser.css';

export class BossEventsLoadError extends ExtendableError {
  reason = null;
  constructor(reason) {
    super();
    this.reason = reason;
  }
}

class BossEventsLoader extends React.PureComponent {
  static propTypes = {
    report: PropTypes.shape({
      title: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
    }).isRequired,
    fight: PropTypes.shape({
      start_time: PropTypes.number.isRequired,
      end_time: PropTypes.number.isRequired,
      boss: PropTypes.number.isRequired,
    }).isRequired,
    children: PropTypes.func.isRequired,
    history: PropTypes.shape({
      push: PropTypes.func.isRequired, // adds to browser history
      replace: PropTypes.func.isRequired, // updates current browser history entry
      location: PropTypes.shape({
        pathname: PropTypes.string.isRequired,
      }).isRequired,
    }),
  };
  state = {
    error: null,
    finished: false,
    bossEvents: null,
  };

  componentDidMount() {
    // noinspection JSIgnoredPromiseFromCall
    this.parse();
  }

  componentDidUpdate(prevProps, prevState) {
    const changed = this.props.report !== prevProps.report
      || this.props.fight !== prevProps.fight;
    if (changed) {
      // noinspection JSIgnoredPromiseFromCall
      this.parse();
    }
  }

  async parse() {
    let events = null;
    return Promise.all([
      this.loadEvents().then(result => {
        events = result;
      }),
    ])
      .then(() => {
        return this.updateEvents(events);
      })
      .catch(error => {
        const isCommonError = error instanceof LogNotFoundError;
        if (!isCommonError) {
          captureException(error);
        }
        this.reset();
        this.setState({
          error,
        });
      });

  }
  async updateEvents(events) {
    const updatedEvents = events.map(e => ({
      ...e,
      isBossEvent: true,
    }));

    this.setState({bossEvents: updatedEvents, finished: true});
  }

  loadEvents() {
    const { report, fight } = this.props;

    const bossConfig = findByBossId(fight.boss);
    if (bossConfig.fight.phases && bossConfig.fight.phases.length !== 0) {      
      const filters = [];

      const phasesForDifficulty = bossConfig.fight.phases.filter(phase => phase.difficulties.includes(fight.difficulty));

      const abilities = phasesForDifficulty.reduce((abilityIds, phase) => {
        if (phase.filter && phase.filter.ability && !abilityIds.includes(phase.filter.ability.id)) {
          return abilityIds.concat(phase.filter.ability.id);
        }
        return abilityIds;
      }, []);

      if (abilities.length > 0) {
        filters.push(`(ability.id in (${abilities.join(',')}))`);
      }
      
      const queries = phasesForDifficulty.reduce((queryAcc, phase) => {
        if (phase.filter && phase.filter.query && !queryAcc.includes(phase.filter.query)) {
          return queryAcc.concat(`(${phase.filter.query})`);
        }
        return queryAcc;
      }, []);

      if (queries.length > 0) {
        filters.push(...queries);
      }
      
      return fetchEvents(report.code, fight.start_time, fight.end_time, undefined, filters.join(' OR '));
    }

    return Promise.resolve([]);
  }

  reset() {
    this.setState({
      finished: false,
      events: null,
    });
  }

  renderError(error) {
    return handleApiError(error, () => {
      this.reset();
      this.props.history.push(makeAnalyzerUrl());
    });
  }

  renderLoading() {
    return (
      <div className="event-parser-loading-text">
        <Trans>Loading...</Trans><br /><br />

        <img src={Ghuun} alt="Ghuun" style={{ transform: 'scaleX(-1)' }} />
      </div>
    );
  }
  render() {
    const error = this.state.error;
    if (error) {
      return this.renderError(error);
    }

    if (!this.state.finished) {
      return this.renderLoading();
    }

    return this.props.children(this.state.bossEvents);
  }
}

export default withRouter(BossEventsLoader);
