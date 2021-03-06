import React from 'react';
import { Chart, Tooltip, Geom, Legend, Axis } from 'bizcharts';
import DataSet from '@antv/data-set';
import Slider from 'bizcharts-plugin-slider';
import autoHeight from '../autoHeight';
import styles from './index.less';

@autoHeight()
export default class TimelineChart extends React.Component {
  render() {
    const {
      title,
      height = 400,
      padding = [60, 20, 40, 40],
      titleMap = {
        y: 'y',
      },
      borderWidth = 2,
      data = [
        {
          x: 0,
          y: 0
        },
      ],
    } = this.props;

    data.sort((a, b) => a.x - b.x);

    let max;
    if (data[0] && data[0].y1 && data[0].y2) {
      max = Math.max(
        [...data].sort((a, b) => b.y - a.y)[0].y
      );
    }

    const ds = new DataSet({
      state: {
        start: data[0].x,
        end: data[data.length - 1].x,
      },
    });

    const dv = ds.createView();
    dv
      .source(data)
      .transform({
        type: 'filter',
        callback: (obj) => {
          const date = obj.x;
          return date <= ds.state.end && date >= ds.state.start;
        },
      })
      .transform({
        type: 'map',
        callback(row) {
          const newRow = { ...row };
          newRow[titleMap.y] = row.y;
          return newRow;
        },
      })
      .transform({
        type: 'fold',
        fields: [titleMap.y], // 展开字段集
        key: 'key', // key字段
        value: 'value', // value字段
      });

    const timeScale = {
      type: 'time',
      tickCount: 10,
      mask: 'DD HH:MM'
    };

    const cols = {
      x: timeScale,
      value: {
        max,
        min: 0,
      },
    };

    const SliderGen = () => (
      <Slider
        padding={[0, padding[1] + 20, 0, padding[3]]}
        width="auto"
        height={26}
        xAxis="x"
        yAxis="y"
        scales={{ x: timeScale }}
        data={data}
        start={ds.state.start}
        end={ds.state.end}
        backgroundChart={{ type: 'line' }}
        onChange={({ startValue, endValue }) => {
          ds.setState('start', startValue);
          ds.setState('end', endValue);
        }}
      />
    );

    return (
      <div className={styles.timelineChart} style={{ height: height + 30 }}>
        <div>
          {title && <h4>{title}</h4>}
          <Chart height={height} padding={padding} data={dv} scale={cols} forceFit>
            <Axis name="y" />
            <Tooltip />
            <Geom type="line" position="x*value" size={borderWidth} color="key" />
          </Chart>
          <div style={{ marginRight: -20 }}>
            <SliderGen />
          </div>
        </div>
      </div>
    );
  }
}
