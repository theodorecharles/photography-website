/**
 * Event Types Distribution Table Component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../../utils/formatters';
import { SkeletonTable } from './SkeletonLoader';

interface EventType {
  event_type: string;
  count: number;
}

interface EventTypesTableProps {
  events: EventType[];
  expandedRows: Set<number>;
  isExpanded: boolean;
  loading?: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const EventTypesTable: React.FC<EventTypesTableProps> = ({
  events,
  expandedRows,
  isExpanded,
  loading,
  onToggleRow,
  onToggleTable,
}) => {
  const { t } = useTranslation();
  
  if (loading) {
    return <SkeletonTable rows={5} />;
  }
  
  if (!events || events.length === 0) {
    return <div className="no-data">{t('metrics.eventTypesTable.noData')}</div>;
  }

  const totalEvents = events.reduce((sum, e) => sum + e.count, 0);

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="events">
          <table>
            <thead>
              <tr>
                <th>{t('metrics.eventTypesTable.eventType')}</th>
                <th className="text-right">{t('metrics.eventTypesTable.count')}</th>
                <th className="text-right">{t('metrics.eventTypesTable.percentOfTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => {
                const percentage = totalEvents > 0 
                  ? ((event.count / totalEvents) * 100).toFixed(1)
                  : '0';
                const expanded = expandedRows.has(index);
                return (
                  <React.Fragment key={index}>
                    <tr 
                      className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                      onClick={() => onToggleRow(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="event-type">{event.event_type}</td>
                      <td className="text-right">{formatNumber(event.count)}</td>
                      <td className="text-right">{percentage}%</td>
                    </tr>
                    {expanded && (
                      <tr className="expanded-content-row">
                        <td colSpan={3}>
                          <div className="expanded-content">
                            <div className="expanded-detail">
                              <strong>{t('metrics.eventTypesTable.eventType')}:</strong> {event.event_type}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.eventTypesTable.totalCount')}:</strong> {formatNumber(event.count)}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.eventTypesTable.percentage')}:</strong> {t('metrics.eventTypesTable.percentageText', { percentage })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <button 
        className="view-more-btn" 
        onClick={onToggleTable}
      >
        {isExpanded ? t('metrics.viewLess') : t('metrics.viewMore')}
      </button>
    </>
  );
};

export default EventTypesTable;

