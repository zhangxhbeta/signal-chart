/**
 * 机车图演示, 通过调用机车图表库实现图表显示
 * 通过详情部分做滚动处理来实现一屏正好显示下, 方便用户不用滚动屏幕
 * 能同时看到图表和数据部分
 *
 * @author zhangxh
 */
$(function () {
  'use strict';

  var minDetailHeight = 30; // 详情区域最小高度 30px
  var ieFix = 1;  // ie 滚动条出现, 所以高度要减去1
  var smallDevicesWidth = 767; // 小屏幕宽度, 超出认定为其他大屏
  var xAxisMax = 1200;
  var dataFormat = d3.time.format('%Y-%m-%d %H:%M:%S'); // 日期格式

  // 往 dataArry 里放初次数据, 之后每隔一段时间往 dataArray 里面追加一段数据, 最多不超过 xAxisMax 条, 超过后删掉最前面的数据
  var dataArray = []; // 初始值空
  pushTestData();
  
  // 初始化图表
  var chart = xhchart.signal({
                               xAxisMax: xAxisMax, // x轴数据总数量
                               dataArray: dataArray, // 提供给图表的数据数组
                               showReferenceLine: false,
                               onSelectLine: function (index, data, refIndex, refData) {
                                 // index 是当前选中索引
                                 // data 是当前选择的 dataArray 里面的数据
                                 // 用户拖动改变竖线时触发

                                 if (data !== undefined) {
                                   $('#time').text(dataFormat(data.date));
                                   $('#speed').text(data.speed);
                                   $('#stationNo').text(data.stationNo);
                                   $('#voltage').text(data.voltage);
                                   $('#lowFrequency').text(data.lowFrequency);
                                   $('#carrierFrequency').text(data.carrierFrequency);
                                   // ... 更新其他表格信息
                                 }

                               }
                             });

  // 处理按钮事件
  $('#voltageUpBtn').on('click', function () {
    chart.updateVoltage(1);
  });

  $('#voltageDownBtn').on('click', function () {
    chart.updateVoltage(-1);
  });

  $('#carrierFrequencyUpBtn').on('click', function () {
    chart.updateCarrierFrequency(1);
  });

  $('#carrierFrequencyDownBtn').on('click', function () {
    chart.updateCarrierFrequency(-1);
  });

  $('#lowFrequencyUpBtn').on('click', function () {
    chart.updateLowFrequency(1);
  });

  $('#lowFrequencyDownBtn').on('click', function () {
    chart.updateLowFrequency(-1);
  });

  $('#speedUpBtn').on('click', function () {
    chart.updateSpeed(1);
  });

  $('#speedDownBtn').on('click', function () {
    chart.updateSpeed(-1);
  });

  $('#toggleLineBtn').on('click', function () {
    // 点击显示隐藏竖线
    chart.toggleSelectLine();
  });

  // 根据窗口高度布局一次详情表格高度, 然后绑定 resiz 事件处理
  // 这里做了响应式, 如果是手机屏幕详情部分就不做滚动处理了
  if ($(window).innerWidth() > smallDevicesWidth) {
    layoutDetail(chart.size.height);
  }

  // 对窗口缩放做一下处理
  $(window).resize(function () {
    chart.updateSize();

    if ($(window).innerWidth() > 767) {
      layoutDetail(chart.size.height);
    }

  });

  /**
   * 详情部分布局
   * @param chartHeight 图表部分计算出来的高度
   */
  function layoutDetail(chartHeight) {
    // 工具栏固定, 图表高度固定, 底栏footer高度固定, 剩余的就是信息详情的高度
    var availableHeight = $(window).innerHeight() - $('#toolbar').outerHeight() - chartHeight - $(
            '#footer').outerHeight();
    availableHeight = availableHeight > minDetailHeight ? availableHeight : minDetailHeight;

    availableHeight -= ieFix; // ie 下面有点滚动条问题

    $('#detail').outerHeight(availableHeight);
  }

  /**
   * 测试模拟数据
   * @returns {Array}
   */
  function pushTestData() {
    var startDate = new Date().getTime() - 1000 * 60 * 60;
    var voltageRandom = 0, lampRandom = 0, carrierFrequencyRandom = 0, lowFrequencyRandom = 0,
        insulationRandom = 0, upDownRandom = 0, abRandom = 0, port12Random = 0, speedRandom = 0;
    var seamaphoreState = 'pass';
    var seamaphoreRandom = Math.round(Math.random() * 6); // 每隔几个信号机来一个进站出站
    var seamaphoreNo = Math.round(Math.random() * 350 + 12300); // 随机来个开始信号机号码
    var stationNames = [
      '温州',
      '青田',
      '丽水',
      '缙云',
      '永康',
      '武义',
      '金华',
      '义乌',
      '诸暨',
      '杭州',
      '德清西',
      '长兴南',
      '宣城',
      '芜湖',
      '巢湖',
      '合肥',
      '淮南',
      '阜阳',
      '亳州',
      '商丘南',
      '定陶',
      '菏泽',
      '梁山',
      '阳谷',
      '聊城',
      '临清',
      '清河城',
      '枣强',
      '衡水',
      '辛集',
      '石家庄北',
      '太原'
    ];
    var startStationNameIndex = Math.round(Math.random() * stationNames.length); // 开始站名
    var seamaphoreStateRandom = 0;
    var stationName = stationNames[startStationNameIndex];
    var stationNo = Math.round(Math.random() * 300 + 200);
    var lamp = 'L';
    var lampStates = [
      'L',    // 绿灯
      'U',    // 黄灯
      'UU',   // 双黄灯
      'HU',   // 红黄灯
      'LU',   // 绿黄灯
      'U2',   // 黄2灯
      'H',    // 红灯
      'B',    // 白灯
      ''     // 空白无码
    ];
    var startLampIndex = Math.round(Math.random() * lampStates.length); // 初始灯颜色
    var powerOnCount = 1;
    var eventCount = 1;

    function nextStation() {
      startStationNameIndex++;
      if (startStationNameIndex >= stationNames.length) {
        startStationNameIndex = 0;
      }
      stationName = stationNames[startStationNameIndex];
      stationNo++;
    }

    function nextSeamaphore() {
      seamaphoreNo += Math.round(Math.random() * 10);
    }

    function generateNewData() {
      var lastData = dataArray[dataArray.length - 1];

      if (lampRandom == 0) {
        lampRandom = Math.round(Math.random() * 120 + 60);

        while (startLampIndex >= lampStates.length) {
          startLampIndex -= lampStates.length;
        }

        lamp = lampStates[startLampIndex];
        startLampIndex += Math.round(Math.random() * 3);
      } else {
        lamp = lastData.lamp;
        lampRandom -= 1;
      }

      var voltage = Math.round(Math.random() * 600 + voltageRandom * 2 + 300);
      voltageRandom += Math.round(Math.random() * 20);
      if (voltageRandom > 500) {
        voltageRandom = 0;
      }

      var carrierFrequency;
      if (carrierFrequencyRandom == 0) {
        carrierFrequencyRandom = Math.round(Math.random() * 18);
        carrierFrequency = Math.round(Math.random() * 2900);
      } else {
        carrierFrequency = lastData.carrierFrequency;
        carrierFrequencyRandom -= 1;
      }

      var lowFrequency;
      if (lowFrequencyRandom == 0) {
        lowFrequencyRandom = Math.round(Math.random() * 20);
        lowFrequency = Math.round(Math.random() * 3 + 9);
      } else {
        lowFrequency = lastData.lowFrequency;
        lowFrequencyRandom -= 1;
      }

      var speed;
      if (speedRandom == 0) {
        speedRandom = Math.round(Math.random() * 3);
        speed = Math.round(Math.random() * 80 + 200);
      } else {
        speed = lastData.speed;
        speedRandom -= 1;
      }

      // 信号机, 每隔 n 个 pass, 来一个 notice, in, out, 然后再重复
      if (seamaphoreStateRandom == 0) {
        if (seamaphoreState === 'pass') {
          if (seamaphoreRandom == 0) {
            seamaphoreState = 'notice';
          } else {
            seamaphoreRandom -= 1;
          }

          nextSeamaphore();
        } else if (seamaphoreState === 'notice') {
          seamaphoreState = 'in';
          nextSeamaphore();
        } else if (seamaphoreState === 'in') {
          seamaphoreState = 'out';
          nextSeamaphore();
          nextStation();
        } else if (seamaphoreState === 'out') {
          seamaphoreState = 'pass';
          seamaphoreRandom = Math.round(Math.random() * 6);
          nextSeamaphore();
        }

        seamaphoreStateRandom = Math.round(Math.random() * 30 + 60);
      } else {
        seamaphoreStateRandom -= 1;
      }

      var upDown;
      if (upDownRandom == 0) {
        upDownRandom = Math.round(Math.random() * 50);
        upDown = Math.round(Math.random()) === 1 ? 'S' : 'X';
      } else {
        upDown = lastData.upDown;
        upDownRandom -= 1;
      }

      var insulation;
      if (insulationRandom == 0) {
        insulationRandom = Math.round(Math.random() * 60);
        insulation = Math.round(Math.random());
      } else {
        insulation = lastData.insulation;
        insulationRandom -= 1;
      }

      var ab;
      if (abRandom == 0) {
        abRandom = Math.round(Math.random() * 120);
        ab = Math.round(Math.random());
      } else {
        ab = lastData.ab;
        abRandom -= 1;
      }

      var port12;
      if (port12Random == 0) {
        port12Random = Math.round(Math.random() * 100);
        port12 = Math.round(Math.random());
      } else {
        port12 = lastData.port12;
        port12Random -= 1;
      }

      if (eventCount % 421 == 0) {
        upDown = '';
        insulation = -1;
        ab = -1;
        port12 = -1;
      }

      return {
        // 灯状态
        // 'L'     绿灯
        // 'U'     黄灯
        // 'UU'    双黄灯
        // 'HU'    红黄灯
        // 'LU'    绿黄灯
        // 'U2'    黄2灯
        // 'H'     红灯
        // 'B'     白灯
        // ''      空白无码
        lamp: lamp,
        voltage: voltage,                   // 感应电压
        carrierFrequency: carrierFrequency, // 中心频/载频
        lowFrequency: lowFrequency,         // 低频
        speed: speed,                       // 速度
        stationName: stationName,           // 车站名
        stationNo: stationNo,               // 车站号
        seamaphoreNo: seamaphoreNo,         // 信号机号
        seamaphoreState: eventCount % 100 < 0 ? '' : seamaphoreState,   // 信号机状态, 通过 'pass', 预告 'notice', 进站
                                            // 'in', 出站 'out', 其他 ''
        upDown: upDown,                     // 上行/下行标志, 上行 'S', 下行 'X', 无效 ''
        insulation: insulation,             // 绝缘, 0 / 1 / -1或undefined (无效)
        ab: ab,                             // ab机, 0 / 1 / -1或undefined (无效)
        port12: port12,                     // Ⅰ/Ⅱ端, 0 / 1 / -1或undefined (无效)
        date: lastData ? new Date(lastData.date.getTime() + 1000) // 当前时间
            : new Date(startDate),
        event: (eventCount++ % 320 === 0) ? '模拟事件' : null,
        powerOnFlag: powerOnCount++ % 640 === 0
      };
    }

    for (var i = 0; i < 300; i++) {
      dataArray.push(generateNewData());
    }

    // 然后定期生产数据进入 dataArray
    setInterval(function () {
      for (var i = 0; i < 20; i++) {
        dataArray.push(generateNewData());
      }
      if (dataArray.length > xAxisMax + 1) {
        dataArray.splice(0, dataArray.length - xAxisMax - 1);
      }

      chart.update(dataArray); // 重新绘制图表
    }, 2000);

    return dataArray;
  }
});