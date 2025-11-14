/**
 * Event Types Distribution Table Component
 */

import React from 'react';
import { formatNumber } from '../../../utils/formatters';

interface EventType {
  event_type: string;
  count: number;
}

interface EventTypesTableProps {
  events: EventType[];
  expandedRows: Set<number>;
  isExpanded: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const EventTypesTable: React.FC<EventTypesTableProps> = ({
  events,
  expandedRows,
  isExpanded,
  onToggleRow,
  onToggleTable,
}) => {
  if (!events || events.length === 0) {
    return <div className="no-data">No event data available</div>;
  }

  const totalEvents = events.reduce((sum, e) => sum + e.count, 0);

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="events">
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th className="text-right">Count</th>
                <th className="text-right">% of Total</th>
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
                              <strong>Event Type:</strong> {event.event_type}
                            </div>
                            <div className="expanded-detail">
                              <strong>Total Count:</strong> {formatNumber(event.count)}
                            </div>
                            <div className="expanded-detail">
                              <strong>Percentage:</strong> {percentage}% of all events
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
        {isExpanded ? 'View Less ▲' : 'View More ▼'}
      </button>
    </>
  );
};

export default EventTypesTable;

