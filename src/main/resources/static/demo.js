/**
 * 往文档里面的 #chart 里面塞一张堆积图
 *
 * @author zhangxh
 */
$(function () {

  // demo 部分
  d3.select('#version').html('机车图实时演示 (随机模拟数据)');

  // 非组件部分
  var minDetailHeight = 30; // 详情区域最小高度 30px
  var ieFix = 1;  // ie 滚动条出现, 所以高度要减去1
  var smallDevicesWidth = 767; // 小屏幕宽度, 超出认定为其他大小
  var xAxisMax = 1200;

  var chart = xhchart.signal({
                               dataArray: generateTestData()
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
  // 这里做了响应式, 如果是手机屏幕就不做自适应了
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
   * 生成测试用数据
   * @returns {Array}
   */
  function generateTestData() {
    var startDate = new Date().getTime() - 1000 * 60 * 60;
    var dataArray = [];
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

    function pushNewData() {
      var lastData = dataArray[dataArray.length - 1];

      if (lampRandom == 0) {
        lampRandom = Math.round(Math.random() * 60 + 30);

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

      dataArray.push({
                       lamp: lamp,
                       voltage: voltage,
                       carrierFrequency: carrierFrequency,
                       lowFrequency: lowFrequency,
                       speed: speed,
                       stationName: stationName,
                       stationNo: stationNo,
                       seamaphoreNo: seamaphoreNo,
                       seamaphoreState: seamaphoreState,
                       upDown: upDown,
                       insulation: insulation,
                       ab: ab,
                       port12: port12,
                       date: lastData ? new Date(lastData.date.getTime() + 1000)
                           : new Date(startDate)
                     });
    }

    for (var i = 0; i < 200; i++) {
      pushNewData();
    }

    // 然后定期生产数据进入 dataArray
    setInterval(function () {
      for (var i = 0; i < 20; i++) {
        pushNewData();
      }
      if (dataArray.length > xAxisMax + 1) {
        dataArray.splice(0, dataArray.length - xAxisMax - 1);
      }
      chart.update(); // 重新绘制图表
    }, 2000);

    return dataArray;
  }
});