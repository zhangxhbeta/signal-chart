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
  var xAxisMax = 1200; // 图表中展示的数据记录条数
  var ofsize = 14;
  var testData = generateTestData();

  // 组件常量
  var gridSize = 48; // 将大图表横向划分为固定的高度单元, 然后方便分配

  // 组件初始化参数
  var option = {
    aspectRatio: 3, // 图表高度宽度比例 1:3
    chartContainerSelector: '#chart', // 图表容器
    margin: {
      top: 5,
      right: 28,
      bottom: 25,
      left: 150
    },
    fontSize: ofsize,
    fontSizeOffset: ofsize / 2,
    labelLeftMargin: 30, // 标签左边距
    firstDateLabelFormat: d3.time.format('%Y-%m-%d'), // 坐标轴第一个值的标签格式
    dateLabelFormat: d3.time.format("%H:%M:%S"),      // 坐标轴日期格式
    voltageMaxs: [4000, 2000, 1000, 400, 200, 100, 40, 20, 10],
    carrierFrequencyMaxs: [4000, 2000, 1000, 400, 200, 100, 50],
    lowFrequencyMaxs: [4000, 2000, 100, 40],
    speedMaxs: [500, 300, 200, 50],
    currentVoltageMaxIndex: 1, // 感应电压图表y轴最大值
    currentCarrierFrequencyMaxIndex: 0, // 载频部分的图表y轴最大值
    currentLowFrequencyMaxIndex: 3, // 低频部分的图表y轴最大值
    currentSpeedMaxIndex: 0, // 速度图表y轴最大值
    currentVoltageToggle: true,
    currentCarrierFrequencyIndexToggle: true,
    currentLowFrequencyToggle: true,
    currentSpeedToggle: true, // 速度图表是否选中
    dataArray: testData, // 测试数据
    chartTipRectWidth: ofsize * 5,
    chartTipRectHeight: ofsize * 4.2,
    carrierFrequencyStartValues: [25, 550, 1700]
  };

  var timeoutHandler;
  // 初始化部分
  // 获取当前 chart 可用宽度, 然后根据比例算出可用高度
  var size = calcChartSize(option.chartContainerSelector);

  // 开始部分，准备svg画布
  var svg = d3.select('#chart').append('svg')
      .attr('width', '100%')
      .attr('height', size.height)
      .attr('viewBox', '0 0 ' + size.width + " " + size.height)
      .style('display', 'block');

  // svg 画布已准备妥当，开始准备图表元素
  var height = size.height - option.margin.bottom - option.margin.top,
      width = size.width - option.margin.left - option.margin.right;
  var gridHeight = height / gridSize;
  var gridWidth = width / xAxisMax;

  // 准备全局 x 轴缩放器
  var x = d3.scale.linear()
      .domain([0, xAxisMax])
      .range([0, width]);

  // 计算子图表高度
  var chartOffset = option.margin.top;
  var chartHeight = gridHeight * 20;
  var lampBeltOffset = chartOffset + chartHeight + gridHeight;
  var semaphoreOffset = lampBeltOffset + gridHeight * 3;
  var semaphoreHeight = gridHeight * 6;
  var insulationOffset = semaphoreOffset + semaphoreHeight + gridHeight * 2;
  var upDownOffset = insulationOffset + gridHeight * 4;
  var abOffset = upDownOffset + gridHeight * 4;
  var port12Offset = abOffset + gridHeight * 4;

  // 添加公共引用数据, 渐变
  addDefs();

  // 绘制静态文本
  drawText();

  // 绘制图表
  update();

  // 添加鼠标点击时的指示竖线
  var selectLine, selectTip;
  var drag = d3.behavior.drag();
  drag.on('drag', function () {
    var e = d3.mouse(d3.select('#chart').node());

    var l = x.invert(e[0] - option.margin.left);
    var index = Math.round(l);
    var pointX = adjustX(l);
    var pointY = e[1] - option.margin.top;

    if (pointX < option.margin.left) {
      pointX = option.margin.left;
    }

    if (pointX > (size.width - option.margin.right)) {
      pointX = size.width - option.margin.right;
    }

    if (selectLine) {
      selectLine.attr('x1', pointX)
          .attr('x2', pointX);
    }

    if (selectTip) {
      updateSelectTip(selectTip, pointX, pointY, index);
    }
  });

  svg.on('click', function () {
    var e = d3.mouse(d3.select('#chart').node());
    // 点在外面的不处理
    if (e[0] < option.margin.left || e[0] > (size.width - option.margin.right)) {
      return;
    }
    // 处理数据问题
    var l = x.invert(e[0] - option.margin.left);
    var index = Math.round(l);
    var pointX = adjustX(l);
    var pointY = e[1] - option.margin.top;

    if (selectLine) {
      selectLine.attr('x1', pointX)
          .attr('x2', pointX)
          .style('display', null);
    } else {
      selectLine = svg.append('line')
          .attr('x1', pointX)
          .attr('y1', option.margin.top)
          .attr('x2', pointX)
          .attr('y2', size.height - option.margin.bottom)
          .style('stroke', '#FB5F27')
          .style('stroke-width', '1.5')
          .style('cursor', 'ew-resize')
          .call(drag);
    }

    if (!selectTip) {
      selectTip = svg.append('g')
          .attr('class', 'selectTip')
          .attr('transform', 'translate(' + pointX + ',' + option.margin.top + ')');

      selectTip.append('rect')
          .attr("width", option.chartTipRectWidth)
          .attr("height", option.chartTipRectHeight)
          .attr('x', 0)
          .attr('y', 0)
          .style("fill", '#000')
          .style('fill-opacity', '0.2');
    }

    // 更新提示
    updateSelectTip(selectTip, pointX, pointY, index);

  });

  // 处理按钮事件
  $('#voltageUpBtn').on('click', function () {
    updateVoltage(1);
  });

  $('#voltageDownBtn').on('click', function () {
    updateVoltage(-1);
  });

  $('#carrierFrequencyUpBtn').on('click', function () {
    updateCarrierFrequency(1);
  });

  $('#carrierFrequencyDownBtn').on('click', function () {
    updateCarrierFrequency(-1);
  });

  $('#lowFrequencyUpBtn').on('click', function () {
    updateLowFrequency(1);
  });

  $('#lowFrequencyDownBtn').on('click', function () {
    updateLowFrequency(-1);
  });

  $('#speedUpBtn').on('click', function () {
    updateSpeed(1);
  });

  $('#speedDownBtn').on('click', function () {
    updateSpeed(-1);
  });

  $('#toggleLineBtn').on('click', function () {
    // 点击显示隐藏竖线
    if (selectLine) {
      if (selectLine.style('display') !== 'none') {
        selectLine.style('display', 'none');
      } else {
        selectLine.style('display', null);
      }

      if (selectTip.style('display') !== 'none') {
        selectTip.style('display', 'none');
      } else {
        selectTip.style('display', null);
      }
    }
  });

  // 根据窗口高度布局一次详情表格高度, 然后绑定 resiz 事件处理
  // 这里做了响应式, 如果是手机屏幕就不做自适应了
  if ($(window).innerWidth() > smallDevicesWidth) {
    layoutDetail(size.height);
  }

  // 对窗口缩放做一下处理
  $(window).resize(function () {
    var size = calcChartSize(option.chartContainerSelector);
    $('#chart svg').height(size.height);

    if ($(window).innerWidth() > 767) {
      layoutDetail(size.height);
    }
  });

  function update() {
    // 绘制图表, 感应电压/载频/低频,速度
    drawChart(chartOffset, chartHeight);

    // 绘制灯和灯带
    drawLamp(lampBeltOffset);
    drawLampBelt(lampBeltOffset, gridHeight * 1.5);

    // 绘制信号机
    drawSemaphore(semaphoreOffset, semaphoreHeight);

    // 准备一个映射器
    var y = d3.scale.linear()
        .domain([0, 1])
        .range([gridHeight * 2, 0]);

    // 绘制绝缘
    drawChairLine(insulationOffset, 'insulation', 'url(#line-gradient-insulation)', function (d) {
      return y(d.insulation);
    });

    // 绘制上/下行
    drawChairLine(upDownOffset, 'updown', '#ec8100', function (d) {
      return y(d.upDown === 'X' ? 1 : 0);
    });

    // 绘制A/B机
    drawChairLine(abOffset, 'ab', '#009a00', function (d) {
      return y(d.ab);
    });

    // 绘制 1/2 端
    drawChairLine(port12Offset, 'port12', '#0000a2', function (d) {
      return y(d.port12);
    });

    // 绘制 x 轴
    drawXAxis(option.margin.top + height);
  }

  function addDefs() {

    var defs = svg.append('defs');

    // 绝缘渐变
    defs.append("linearGradient")
        .attr("id", "line-gradient-insulation")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "red"},
                {offset: "50%", color: "red"},
                {offset: "100%", color: "blue"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 灯上面的高光颜色定义
    defs.append("radialGradient")
        .attr("id", "radial-gradient-lamp")
        .attr("cx", '.45')
        .attr("cy", '.35')
        .attr('r', '.7')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#fff", stopOpacity: '.05'},
                {offset: "30%", color: "#888", stopOpacity: '.1'},
                {offset: "75%", color: "#888", stopOpacity: '.2'},
                {offset: "100%", color: "#888", stopOpacity: '.3'}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        })
        .style('stop-opacity', function (d) {
          return d.stopOpacity;
        });

    // 双黄灯
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-uu")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#FE2"},
                {offset: "45%", color: "#FE2"},
                {offset: "46%", color: "black"},
                {offset: "54%", color: "black"},
                {offset: "55%", color: "#FE2"},
                {offset: "100%", color: "#FE2"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 红黄灯
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-hu")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "red"},
                {offset: "45%", color: "red"},
                {offset: "46%", color: "black"},
                {offset: "54%", color: "black"},
                {offset: "55%", color: "#FE2"},
                {offset: "100%", color: "#FE2"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 绿黄灯
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-lu")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "green"},
                {offset: "45%", color: "green"},
                {offset: "46%", color: "black"},
                {offset: "54%", color: "black"},
                {offset: "55%", color: "#FE2"},
                {offset: "100%", color: "#FE2"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 灯带, 双黄
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-belt-uu")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "yellow"},
                {offset: "40%", color: "yellow"},
                {offset: "40%", color: 'black'},
                {offset: "60%", color: "black"},
                {offset: "60%", color: "yellow"},
                {offset: "100%", color: "yellow"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 灯带, 红黄
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-belt-hu")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "red"},
                {offset: "50%", color: "red"},
                {offset: "50%", color: "yellow"},
                {offset: "100%", color: "yellow"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 灯带, 绿黄
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-belt-lu")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "green"},
                {offset: "50%", color: "green"},
                {offset: "50%", color: "yellow"},
                {offset: "100%", color: "yellow"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });

    // 灯带, 黄2
    defs.append("linearGradient")
        .attr("id", "line-gradient-lamp-belt-u2")
        .attr("x1", '0%').attr("y1", '0%')
        .attr("x2", '0%').attr("y2", '100%')
        .selectAll("stop")
        .data([
                {offset: "0%", color: "yellow"},
                {offset: "50%", color: "yellow"},
                {offset: "50%", color: "white"},
                {offset: "100%", color: "white"}
              ])
        .enter()
        .append("stop")
        .attr("offset", function (d) {
          return d.offset;
        })
        .attr("stop-color", function (d) {
          return d.color;
        });
  }

  function drawText() {
    var chartLabelMarginLeft = 14;
    var chartLabelMarginTop = 6;

    svg.append('text')
        .attr('id', 'voltageLabelToggle')
        .attr('class', 'fontawesome voltage-label')
        .attr('x', 0)
        .attr('y', chartOffset + option.fontSizeOffset)
        .attr('dy', '.35em')
        .text(toggleText(option.currentVoltageToggle))
        .on('click', function () {
          option.currentVoltageToggle = !option.currentVoltageToggle;
          updateVoltage(0);
        });

    svg.append('text')
        .attr('id', 'voltageLabel')
        .attr('class', 'voltage-label')
        .attr("x", chartLabelMarginLeft)
        .attr("y", chartOffset + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text(voltageText())
        .on('click', function () {
          option.currentVoltageToggle = !option.currentVoltageToggle;
          updateVoltage(0);
        });

    svg.append('text')
        .attr('id', 'carrierFrequencyLabelToggle')
        .attr('class', 'fontawesome carrier-frequency-label')
        .attr('x', 0)
        .attr('y', chartOffset + option.fontSizeOffset + option.fontSize + chartLabelMarginTop)
        .attr('dy', '.35em')
        .text(toggleText(option.currentCarrierFrequencyIndexToggle))
        .on('click', function () {
          option.currentCarrierFrequencyIndexToggle = !option.currentCarrierFrequencyIndexToggle;
          updateCarrierFrequency(0);
        });

    svg.append('text')
        .attr('id', 'carrierFrequencyLabel')
        .attr('class', 'carrier-frequency-label')
        .attr("x", chartLabelMarginLeft)
        .attr("y", chartOffset + option.fontSizeOffset + option.fontSize + chartLabelMarginTop)
        .attr("dy", ".35em")
        .text(carrierFrequencyText())
        .on('click', function () {
          option.currentCarrierFrequencyIndexToggle = !option.currentCarrierFrequencyIndexToggle;
          updateCarrierFrequency(0);
        });

    svg.append('text')
        .attr('id', 'lowFrequencyLabelToggle')
        .attr('class', 'fontawesome low-frequency-label')
        .attr('x', 0)
        .attr('y', chartOffset + option.fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 2)
        .attr('dy', '.35em')
        .text(toggleText(option.currentLowFrequencyToggle))
        .on('click', function () {
          option.currentLowFrequencyToggle = !option.currentLowFrequencyToggle;
          updateLowFrequency(0);
        });

    svg.append('text')
        .attr('id', 'lowFrequencyLabel')
        .attr('class', 'low-frequency-label')
        .attr("x", chartLabelMarginLeft)
        .attr("y", chartOffset + option.fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 2)
        .attr("dy", ".35em")
        .text(lowFrequencyText())
        .on('click', function () {
          option.currentLowFrequencyToggle = !option.currentLowFrequencyToggle;
          updateLowFrequency(0);
        });

    svg.append('text')
        .attr('id', 'speedLabelToggle')
        .attr('class', 'fontawesome speed-label')
        .attr('x', 0)
        .attr('y', chartOffset + option.fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 3)
        .attr('dy', '.35em')
        .text(toggleText(option.currentLowFrequencyToggle))
        .on('click', function () {
          option.currentSpeedToggle = !option.currentSpeedToggle;
          updateSpeed(0);
        });

    svg.append('text')
        .attr('id', 'speedLabel')
        .attr('class', 'speed-label')
        .attr("x", chartLabelMarginLeft)
        .attr("y", chartOffset + option.fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 3)
        .attr("dy", ".35em")
        .text(speedText())
        .on('click', function () {
          option.currentSpeedToggle = !option.currentSpeedToggle;
          updateSpeed(0);
        });

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", lampBeltOffset + option.fontSizeOffset)
        .attr("dy", ".4em")
        .text('灯码');

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", semaphoreOffset + gridHeight + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text('信号机');

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", insulationOffset + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text('绝缘');

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", upDownOffset + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text('上/下行');

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", abOffset + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text('A/B机');

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", port12Offset + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text('Ⅰ/Ⅱ端');

    svg.append('text')
        .attr("x", option.labelLeftMargin)
        .attr("y", option.margin.top + height + option.fontSizeOffset)
        .attr("dy", ".35em")
        .text('时间里程');
  }

  /**
   * 绘制图表的部分
   */
  function drawChart(chartOffset, chartHeight) {
    var groupChart = svg.select('g.lineChart');

    var y = d3.scale.linear()
        .domain([0, option.voltageMaxs[option.currentVoltageMaxIndex]])
        .range([chartHeight, 0]);

    if (groupChart.size() === 0) {
      // 添加组
      groupChart = svg.append('g')
          .attr('class', 'lineChart')
          .attr('transform', 'translate(' + option.margin.left + ',' + chartOffset + ')');

      // 绘制竖方向网格
      function makeXAxis() {
        return d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(10);
      }

      groupChart.append("g")
          .attr("class", "grid")
          .call(makeXAxis().tickSize(chartHeight, 0, 0).tickFormat(''));

      // 绘制水平方向网格
      function makeYAxis() {
        return d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5);
      }

      groupChart.append("g")
          .attr("class", "grid")
          .call(makeYAxis().tickSize(-width, 0, 0).tickFormat(''));
    } else {
      groupChart.selectAll('path').remove();
    }

    // 绘制感应电压
    if (option.currentVoltageToggle) {
      var yVoltage = y;
      var lineVoltage = d3.svg.line().x(function (d, i) {
        return x(i);
      }).y(function (d) {
        return yVoltage(d.voltage);
      });

      groupChart.append("path")
          .attr('class', 'pathVoltage')
          .datum(option.dataArray)
          .attr("d", lineVoltage)
          .style("fill", "none")
          .style("stroke-width", 1)
          .style("stroke", '#e44')
          .style("stroke-opacity", 0.9);
    }

    // 绘制载频
    if (option.currentCarrierFrequencyIndexToggle) {

      // 计算最小值
      var min = d3.min(option.dataArray, function (d) {
        return d.carrierFrequency;
      });

      var start = option.carrierFrequencyStartValues[0];
      for (var i = 1; i < option.carrierFrequencyStartValues.length; i++) {
        if (min >= option.carrierFrequencyStartValues[i]) {
          start = option.carrierFrequencyStartValues[i];
        } else {
          break;
        }
      }

      var yCarrierFrequency = d3.scale.linear()
          .domain([start, option.carrierFrequencyMaxs[option.currentCarrierFrequencyMaxIndex]])
          .range([chartHeight, 0]);

      var lineCarrierFrequency = d3.svg.line().x(function (d, i) {
        return x(i);
      }).y(function (d) {
        return yCarrierFrequency(d.carrierFrequency);
      }).interpolate("step-after");

      groupChart.append("path")
          .datum(option.dataArray)
          .attr("d", lineCarrierFrequency)
          .style("fill", "none")
          .style("stroke-width", 1)
          .style("stroke", '#0d0')
          .style("stroke-opacity", 0.9);
    }

    // 绘制低频
    if (option.currentLowFrequencyToggle) {
      var yLowFrequency = d3.scale.linear()
          .domain([0, option.lowFrequencyMaxs[option.currentLowFrequencyMaxIndex]])
          .range([chartHeight, 0]);

      var lineLowFrequency = d3.svg.line().x(function (d, i) {
        return x(i);
      }).y(function (d) {
        return yLowFrequency(d.lowFrequency);
      }).interpolate("step-after");

      groupChart.append("path")
          .datum(option.dataArray)
          .attr("d", lineLowFrequency)
          .style("fill", "none")
          .style("stroke-width", 1)
          .style("stroke", '#00d')
          .style("stroke-opacity", 0.9);
    }

    // 绘制速度
    if (option.currentSpeedToggle) {
      var ySpeed = d3.scale.linear()
          .domain([0, option.speedMaxs[option.currentSpeedMaxIndex]])
          .range([chartHeight, 0]);

      var lineSpeed = d3.svg.line().x(function (d, i) {
        return x(i);
      }).y(function (d) {
        return ySpeed(d.speed);
      });

      groupChart.append("path")
          .datum(option.dataArray)
          .attr("d", lineSpeed)
          .style("fill", "none")
          .style("stroke-width", 1)
          .style("stroke", '#aa0')
          .style("stroke-opacity", 0.9);
    }
  }

  /**
   * 绘制实时灯状态
   */
  function drawLamp(lampBeltOffset) {
    // 绘制当前灯
    var lampGroup = svg.select('g.lamp');
    if (lampGroup.size() == 0) {
      // 添加灯的分组
      lampGroup = svg.append('g')
          .attr('class', 'lamp')
          .attr('transform', 'translate(0,' + lampBeltOffset + ')');
    }

    var cx = option.labelLeftMargin + 40;
    var lamp = lampGroup.selectAll('circle')
        .data([option.dataArray[option.dataArray.length - 1]]);

    var lampFill = function (d) {
      if (d.lamp === '' || d.lamp === 'blank') {
        return 'black';
      } else if (d.lamp === 'L') {
        return 'green';
      } else if (d.lamp === 'U' || d.lamp === 'U2') {
        return '#FE2';
      } else if (d.lamp === 'H') {
        return 'red';
      } else if (d.lamp === 'B') {
        return 'white';
      }

      return 'url(#line-gradient-lamp-' + d.lamp.toLowerCase() + ')';
    };

    lamp.style('fill', lampFill);
    lamp.enter()
        .append('circle')
        .attr('cx', cx)
        .attr('cy', gridHeight)
        .attr('r', gridHeight)
        .style('fill', lampFill);

    // 遮一层高光
    lamp.enter()
        .append('circle')
        .attr('cx', cx)
        .attr('cy', gridHeight)
        .attr('r', gridHeight)
        .style('fill', 'url(#radial-gradient-lamp)');

    // 黄2灯的字
    var lampTextSize = 8;
    var text = lampGroup.selectAll('text')
        .data([option.dataArray[option.dataArray.length - 1]]);

    text.text(function (d) {
      return d.lamp === 'U2' ? '2' : '';
    });
    text.enter().append('text')
        .attr("x", cx - lampTextSize / 2)
        .attr("y", gridHeight)
        .attr("dy", ".35em")
        .text(function (d) {
          return d.lamp === 'U2' ? '2' : '';
        });
  }

  /**
   * 绘制灯带
   */
  function drawLampBelt(lampBeltOffset, lampBeltHeight) {
    // 添加灯带
    var lampBeltGroup = svg.select('g.lampBelt');
    if (lampBeltGroup.size() == 0) {
      svg.append('rect')
          .attr('class', 'lamp-background')
          .attr("width", width)
          .attr("height", lampBeltHeight * 2)
          .attr('y', lampBeltOffset - lampBeltHeight / 2)
          .attr('x', option.margin.left);

      lampBeltGroup = svg.append('g')
          .attr('class', 'lampBelt')
          .attr('transform', 'translate(' + option.margin.left + ',' + lampBeltOffset + ')');
    }

    var prevIndex = 0;
    var lampDatas = option.dataArray.reduce(
        function (previousValue, currentValue, currentIndex, array) {
          if (currentIndex > 0) {
            var prevIndexData = array[currentIndex - 1];

            // 如果当前状态又变, 或者是最后一个
            if (prevIndexData.lamp !== currentValue.lamp
                || currentIndex === array.length - 1) {
              // 前一个状态和现在这个不同,
              previousValue.push({
                                   index: prevIndex,
                                   length: currentIndex - prevIndex,
                                   lamp: array[prevIndex].lamp
                                 });

              prevIndex = currentIndex;
            }
          }
          return previousValue;
        }, []);

    var rectLamp = lampBeltGroup.selectAll("rect.lamp")
        .data(lampDatas);

    var lampFill = function (d) {
      if (d.lamp === '' || d.lamp === 'blank') {
        return 'black';
      } else if (d.lamp === 'L') {
        return 'green';
      } else if (d.lamp === 'U') {
        return 'yellow';
      } else if (d.lamp === 'H') {
        return 'red';
      } else if (d.lamp === 'B') {
        return 'white';
      }

      return 'url(#line-gradient-lamp-belt-' + d.lamp.toLowerCase() + ')';
    };

    rectLamp
        .attr("width", function (d) {
          return d.length * gridWidth;
        })
        .attr('x', function (d) {
          return d.index * gridWidth;
        }).style("fill", lampFill);

    rectLamp.enter()
        .append("rect")
        .attr('class', 'lamp')
        .attr("width", function (d) {
          return d.length * gridWidth;
        })
        .attr("height", lampBeltHeight)
        .attr('x', function (d) {
          return d.index * gridWidth;
        })
        .style("fill", lampFill);

    rectLamp.exit().remove();
  }

  /**
   * 绘制阶梯图
   */
  function drawChairLine(seamaphoreOffset, cls, stroke, generateorY) {

    svg.select('g.' + cls).remove();
    var g = svg.append('g')
        .attr('class', cls)
        .attr('transform', 'translate(' + option.margin.left + ',' + seamaphoreOffset + ')');

    var line = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(generateorY).interpolate("step-after");

    g.append("path")
        .datum(option.dataArray)
        .attr("d", line)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", stroke)
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制信号机部分
   * @param seamaphoreOffset
   * @param semaphoreHeight
   */
  function drawSemaphore(seamaphoreOffset, semaphoreHeight) {

    var g = svg.select('g.semaphore');
    if (g.size() == 0) {
      // 先绘制底线
      svg.append('line').attr('x1', option.margin.left)
          .attr('y1', seamaphoreOffset + semaphoreHeight)
          .attr('x2', size.width - option.margin.right)
          .attr('y2', seamaphoreOffset + semaphoreHeight)
          .style('stroke', '#000');
    } else {
      // 删掉原来绘制的
      g.remove();
    }

    // 绘制信号
    var heightUnit = semaphoreHeight / 6;
    g = svg.append('g')
        .attr('class', 'semaphore')
        .attr('transform', 'translate(' + option.margin.left + ',' + seamaphoreOffset + ')');

    // 过滤数据
    var stationDatas = option.dataArray.reduce(
        function (previousValue, currentValue, currentIndex, array) {
          if (currentIndex > 0) {
            var prevIndexData = array[currentIndex - 1];
            if (prevIndexData.seamaphoreNo !== currentValue.seamaphoreNo
                || prevIndexData.seamaphoreState !== currentValue.seamaphoreState) {
              // 前一个状态和现在这个不同, 说明需要图表上绘制一下
              previousValue.push({
                                   index: currentIndex,
                                   value: prevIndexData
                                 });

            }
          }
          return previousValue;
        }, []);

    var grid = g.selectAll("g")
        .data(stationDatas)
        .enter()
        .append("g")
        .attr("transform", function (d) {
          return 'translate(' + x(d.index) + ',0)';
        });

    grid.append('path')
        .attr('d', function (d) {
          var path = [
            'M', 0, heightUnit * 3,
            'A', heightUnit / 2, heightUnit / 2, 0, 1, 0, 0, heightUnit * 2.9,
            'Z'
          ];

          if (d.value.seamaphoreState !== 'pass') {
            // 第二个圆圈
            path = path.concat([
                                 'M', 0, heightUnit * 4,
                                 'A', heightUnit / 2, heightUnit / 2, 0, 1, 0, 0, heightUnit * 3.9,
                                 'Z'
                               ]);
          }

          if (d.value.seamaphoreState === 'in') {
            path = path.concat([
                                 'M', -heightUnit, 0,
                                 'L', heightUnit, 0,
                                 'Z'
                               ]);
          }

          if (d.value.seamaphoreState === 'in') {
            path = path.concat([
                                 'M', 0, 0,
                                 'L', 0, semaphoreHeight,
                                 'Z'
                               ]);
          } else {
            path = path.concat([
                                 'M', 0, heightUnit * 3,
                                 'L', 0, semaphoreHeight,
                                 'Z'
                               ]);
          }

          return path.join(" ");
        })
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#000')
        .style("stroke-opacity", 0.9);

    grid.append('text')
        .attr("x", heightUnit)
        .attr("y", heightUnit)
        .attr("dy", ".25em")
        .style('font-size', '8pt')
        .text(function (d) {
          if (d.value.seamaphoreState === 'in') {
            return d.value.stationNo;
          } else {
            return '';
          }
        });

    grid.append('text')
        .attr("x", heightUnit)
        .attr("y", heightUnit * 3)
        .attr("dy", ".25em")
        .style('font-size', '9pt')
        .text(function (d) {
          var data = d.value;
          if (data.seamaphoreState === 'in') {
            return data.stationName;
          } else if (data.seamaphoreState === 'out') {
            return '出站';
          } else if (data.seamaphoreState === 'notice') {
            return '预告';
          } else {
            return '';
          }

        });

    grid.append('text')
        .attr("x", 2)
        .attr("y", heightUnit * 5)
        .attr("dy", ".4em")
        .style('font-size', '8pt')
        .text(function (d) {
          return d.value.upDown + ' ' + d.value.seamaphoreNo;
        });
  }

  /**
   * 绘制 x 轴
   */
  function drawXAxis(xAxisOffset) {
    svg.select('g.axis').remove();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(function (d) {
          if (d >= option.dataArray.length) {
            return '';
          }
          if (d == 0) {
            return option.firstDateLabelFormat(option.dataArray[d].date);
          } else {
            return option.dateLabelFormat(option.dataArray[d].date);
          }
        });

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + option.margin.left + "," + xAxisOffset + ")")
        .call(xAxis);
  }

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
   * 计算图表的大小, 根据容器大小自适应
   * @returns {{width: *, height: number}} 图表的大小
   */
  function calcChartSize(element) {
    var boxWidth, box = d3.select(element).node().getBoundingClientRect();
    if (!box.width) {
      boxWidth = box.width;
    } else {
      boxWidth = box.right - box.left;
    }

    return {
      width: boxWidth,
      height: Math.floor(boxWidth / option.aspectRatio)
    }
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
      update(); // 重新绘制图表
    }, 2000);

    return dataArray;
  }

  function adjustX(index) {
    return x(index) + option.margin.left;
    // var minWidth = width / xAxisMax;
    // var adjust = x % minWidth;
    // return adjust > minWidth / 2 ? x + minWidth - adjust : x - adjust;
  }

  function updateVoltage(val) {
    option.currentVoltageMaxIndex += val;
    if (val > 0 && option.currentVoltageMaxIndex > option.voltageMaxs.length - 1) {
      option.currentVoltageMaxIndex = option.voltageMaxs.length - 1;
    } else if (val < 0 && option.currentVoltageMaxIndex < 0) {
      option.currentVoltageMaxIndex = 0;
    }

    drawChart(chartOffset, chartHeight);
    updateVoltageLabel();
  }

  function updateCarrierFrequency(val) {
    option.currentCarrierFrequencyMaxIndex += val;
    if (val > 0 && option.currentCarrierFrequencyMaxIndex > option.carrierFrequencyMaxs.length - 1) {
      option.currentCarrierFrequencyMaxIndex = option.carrierFrequencyMaxs.length - 1;
    } else if (val < 0 && option.currentCarrierFrequencyMaxIndex < 0) {
      option.currentCarrierFrequencyMaxIndex = 0;
    }

    drawChart(chartOffset, chartHeight);
    updateCarrierFrequencyLabel();
  }

  function updateLowFrequency(val) {
    option.currentLowFrequencyMaxIndex += val;
    if (val > 0 && option.currentLowFrequencyMaxIndex > option.lowFrequencyMaxs.length - 1) {
      option.currentLowFrequencyMaxIndex = option.lowFrequencyMaxs.length - 1;
    } else if (val < 0 && option.currentLowFrequencyMaxIndex < 0) {
      option.currentLowFrequencyMaxIndex = 0;
    }

    drawChart(chartOffset, chartHeight);
    updateLowFrequencyLabel();
  }

  function updateSpeed(val) {
    option.currentSpeedMaxIndex += val;
    if (val > 0 && option.currentSpeedMaxIndex > option.speedMaxs.length - 1) {
      option.currentSpeedMaxIndex = option.speedMaxs.length - 1;
    } else if (val < 0 && option.currentSpeedMaxIndex < 0) {
      option.currentSpeedMaxIndex = 0;
    }

    drawChart(chartOffset, chartHeight);
    updateSpeedLabel();
  }

  function updateVoltageLabel() {
    d3.select('#voltageLabel').text(voltageText());
    d3.select('#voltageLabelToggle').text(toggleText(option.currentVoltageToggle))
  }

  function updateCarrierFrequencyLabel() {
    d3.select('#carrierFrequencyLabel').text(carrierFrequencyText());
    d3.select('#carrierFrequencyLabelToggle').text(toggleText(option.currentCarrierFrequencyIndexToggle));
  }

  function updateLowFrequencyLabel() {
    d3.select('#lowFrequencyLabel').text(lowFrequencyText());
    d3.select('#lowFrequencyLabelToggle').text(toggleText(option.currentLowFrequencyToggle));
  }

  function updateSpeedLabel() {
    d3.select('#speedLabel').text(speedText());
    d3.select('#speedLabelToggle').text(toggleText(option.currentSpeedToggle));
  }

  function voltageText() {
    return '感应电压 ' + option.voltageMaxs[option.currentVoltageMaxIndex] + 'mV';
  }

  function carrierFrequencyText() {
    return '中心频 ' + option.carrierFrequencyMaxs[option.currentCarrierFrequencyMaxIndex] + 'Hz';
  }

  function lowFrequencyText() {
    return '低频 ' + option.lowFrequencyMaxs[option.currentLowFrequencyMaxIndex] + '(Hz/ms)';
  }

  function speedText() {
    return '速度 ' + option.speedMaxs[option.currentSpeedMaxIndex] + '(km/h)';
  }

  function toggleText(toggle) {
    return toggle ? "\uf046" : '\uf096'
  }

  function chartSelectTip(i) {
    if (i < 0 || i > option.dataArray.length - 1) {
      return [];
    }

    return [
      option.dataArray[i].voltage + 'mV',
      option.dataArray[i].carrierFrequency + 'Hz',
      option.dataArray[i].lowFrequency + '(Hz/ms)',
      option.dataArray[i].speed + '(km/h)'
    ];
  }

  function updateSelectTip(selectTip, pointX, pointY, index) {

    var labelData = chartSelectTip(index);
    var mouseMargin = {
      x: 8,
      y: 8
    };

    var translateX = (pointX + mouseMargin.x), translateY = (pointY + mouseMargin.y);

    if (translateX + option.chartTipRectWidth > size.width) {
      translateX = pointX - option.chartTipRectWidth - mouseMargin.x;
    }

    if (translateY + option.chartTipRectHeight > size.height) {
      translateY = size.height - option.chartTipRectHeight;
    }

    if (translateY < 0) {
      translateY = 0;
    }

    selectTip.attr('transform', 'translate(' + translateX + ',' + translateY + ')')
        .style('display', null);

    var s = selectTip.selectAll('text').data(labelData);
    s.text(function (d) {
      return d;
    }).style('display', null);

    s.exit().remove();

    s.enter().append('text')
        .attr('x', 0)
        .attr('y', function (d, i) {
          return i * option.fontSize;
        })
        .attr('dy', '1em')
        .text(function (d) {
          return d;
        })
        .style('font-weight', 'bold')
        .style('fill-opacity', '0.7')
        .style('fill', function (d, i) {

          if (i === 0) {
            return 'red';
          } else if (i === 1) {
            return 'green';
          } else if (i === 2) {
            return 'blue';
          } else {
            return '#550';
          }
        });

    var bg = selectTip.select('rect');
    if (index < 0 || index > option.dataArray.length - 1) {
      bg.style('display', 'none');
    } else {
      bg.style('display', null);
    }

    // 隔多少秒隐藏
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
    }

    timeoutHandler = setTimeout(function () {
      selectTip.select('rect').style('display', 'none');
      selectTip.selectAll('text').style('display', 'none');
    }, 3000);
  }
});