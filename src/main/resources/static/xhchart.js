/**
 * 全局命名空间 xhchart, 目前里面有一个模块 signal, 用于机车图
 *
 * 机车图 api 说明
 *
 * signal.update(newDataArray)         更新图表的数据源, 用于数据有变化以后更新图表显示, newDataArray 可选参数, 提供新的数据数组
 * signal.updateVoltage(val)           用于加减感应电压范围, val 取值正数那么是往上加范围, 取值负数往下减范围
 * signal.updateCarrierFrequency(val)  同上, 用于加减范围
 * signal.updateLowFrequency(val)      同上, 用于加减范围
 * signal.updateSpeed(val)             同上, 用于加减范围
 * signal.toggleSelectLine()           隐藏/显示选中时的竖线
 * signal.updateSize()                 窗口有变化时更新图表大小
 * signal.size                         获取当前图表大小
 *
 * @author zhangxh
 * @type {{signal}}
 */
var xhchart = (function () {
  'use strict';

  var xhchart = {};

  /**
   * 机车图模块
   */
  xhchart.signal = function (initOption) {

    // 防止别人不传参
    if (initOption === undefined) {
      initOption = {};
    }

    // 组件常量
    var gridSize = 49; // 将大图表横向划分为固定的高度单元, 然后方便分配

    // 组件初始化参数
    var option = {
      xAxisMax: initOption.xAxisMax || 1200,
      aspectRatio: initOption.aspectRatio || 3, // 图表高度宽度比例 1:3
      chartContainerSelector: initOption.chartContainerSelector || '#chart', // 图表容器
      margin: initOption.margin || {
        top: 5,
        right: 28,
        bottom: 25,
        left: 150
      },
      scale: 1,
      fontSize: initOption.fontSize || 14,
      labelLeftMargin: initOption.labelLeftMargin || 30, // 标签左边距
      firstDateLabelFormat: initOption.firstDateLabelFormat || d3.time.format('%Y-%m-%d'), // 坐标轴第一个值的标签格式
      dateLabelFormat: initOption.dateLabelFormat || d3.time.format("%H:%M:%S"),      // 坐标轴日期格式
      voltageMaxs: initOption.voltageMaxs || [4000, 2000, 1000, 400, 200, 100, 40, 20, 10],
      carrierFrequencyMaxs: initOption.carrierFrequencyMaxs || [4000, 2000, 1000, 400, 200, 100,
                                                                50],
      lowFrequencyMaxs: initOption.lowFrequencyMaxs || [4000, 2000, 100, 40],
      speedMaxs: initOption.speedMaxs || [500, 300, 200, 50],
      currentVoltageMaxIndex: initOption.currentVoltageMaxIndex || 1, // 感应电压图表y轴最大值
      currentCarrierFrequencyMaxIndex: initOption.currentCarrierFrequencyMaxIndex || 0, // 载频部分的图表y轴最大值
      currentLowFrequencyMaxIndex: initOption.currentLowFrequencyMaxIndex || 3, // 低频部分的图表y轴最大值
      currentSpeedMaxIndex: initOption.currentSpeedMaxIndex || 0, // 速度图表y轴最大值
      currentVoltageToggle: initOption.currentVoltageToggle !== undefined
          ? initOption.currentVoltageToggle : true,
      currentCarrierFrequencyIndexToggle: initOption.currentCarrierFrequencyIndexToggle
                                          !== undefined
          ? initOption.currentCarrierFrequencyIndexToggle : true,
      currentLowFrequencyToggle: initOption.currentLowFrequencyToggle !== undefined
          ? initOption.currentLowFrequencyToggle : true,
      currentSpeedToggle: initOption.currentSpeedToggle !== undefined
          ? initOption.currentSpeedToggle : true, // 速度图表是否选中
      dataArray: initOption.dataArray || [], // 测试数据
      carrierFrequencyStartValues: initOption.carrierFrequencyStartValues || [25, 550, 1700],
      onSelectLine: initOption.onSelectLine,
      showReferenceLine: initOption.showReferenceLine !== undefined ? initOption.showReferenceLine
          : true, // 是否显示参考线(副游标)
      lineColor1: initOption.lineColor1 || '#04c6dd',
      lineColor2: initOption.lineColor2 || '#b702cc',
      marginL: function () {
        return option.margin.left * option.scale;
      },
      marginR: function () {
        return option.margin.right * option.scale;
      },
      marginT: function () {
        return option.margin.top * option.scale;
      },
      marginB: function () {
        return option.margin.bottom * option.scale;
      }
    };

    var fontSizeOffset = option.fontSize / 2;
    var chartTipRectWidth = option.fontSize * 5;
    var chartTipRectHeight = option.fontSize * 4.2;

    var timeoutHandler;
    var _svgSize;

    // 闪灯发光效果的 interval 周期
    var it;
    var flashIndex = 0, flashAngle = 0.7;
    var flash = [0, 0.7, 0.9];
    var flashToggle = true;

    // 初始化部分
    // 获取当前 chart 可用宽度, 然后根据比例算出可用高度
    var size = _svgSize = calcChartSize();

    // 开始部分，准备svg画布
    var svg = d3.select('#chart').append('svg')
        .attr('width', '100%')
        .attr('height', size.height)
        .attr('viewBox', '0 0 ' + size.width + " " + size.height)
        .style('display', 'block');

    // svg 画布已准备妥当，开始准备图表元素
    var height = size.height - option.marginB() - option.marginT(),
        width = size.width - option.marginL() - option.marginR();
    var gridHeight = height / gridSize;
    var gridWidth = width / option.xAxisMax;

    // 准备全局 x 轴缩放器
    var x = d3.scale.linear()
        .domain([0, option.xAxisMax])
        .range([0, width]);

    // 计算子图表高度
    var chartOffset = option.marginT();
    var chartHeight = gridHeight * 20;
    var lampBeltOffset = chartOffset + chartHeight + gridHeight;
    var semaphoreOffset = lampBeltOffset + gridHeight * 4;
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
    var selectLine, selectTip, referenceLine; // 选择线, 选择线提示, 参考线, 也就是客户常说的主游标和副游标系统

    var dragSelectLine = d3.behavior.drag().on('drag', function () {
      d3.event.sourceEvent.stopPropagation();

      var e = d3.mouse(d3.select('#chart').node());

      var l = x.invert(e[0] / option.scale - option.margin.left);
      var index = Math.round(l);
      index = fixIndexOutRange(index);

      var pointX = xInSvg(l);
      var pointY = e[1] / option.scale - option.margin.top;

      if (pointX < option.margin.left) {
        pointX = option.margin.left;
      }

      if (pointX > (size.width - option.margin.right)) {
        pointX = size.width - option.margin.right;
      }

      if (selectLine) {
        selectLine.attr('x1', pointX)
            .attr('x2', pointX)
            .datum(index);
      }

      if (selectTip) {
        updateSelectTip(selectTip, pointX, pointY, index);
      }
    });

    var dragReferenceLine = d3.behavior.drag().on('drag', function () {
      d3.event.sourceEvent.stopPropagation();

      var e = d3.mouse(d3.select('#chart').node());

      var l = x.invert(e[0] / option.scale - option.margin.left);
      var index = Math.round(l);
      index = fixIndexOutRange(index);

      var pointX = xInSvg(l);

      if (pointX < option.margin.left) {
        pointX = option.margin.left;
      }

      if (pointX > (size.width - option.margin.right)) {
        pointX = size.width - option.margin.right;
      }

      if (referenceLine) {
        referenceLine.attr('x1', pointX)
            .attr('x2', pointX)
            .datum(index);

        trigOnSelectLineEvent();
      }
    });

    // 默认选择最左边
    selectLine = svg.append('line')
        .attr('class', 'select-line')
        .attr('x1', option.margin.left)
        .attr('y1', option.margin.top)
        .attr('x2', option.margin.left)
        .attr('y2', size.height - option.margin.bottom)
        .datum(0)
        .call(dragSelectLine);

    if (option.showReferenceLine) {
      var half = Math.round(option.xAxisMax / 2);
      var pointX = xInSvg(half);
      referenceLine = svg.append('line')
          .attr('class', 'reference-line')
          .attr('x1', pointX)
          .attr('y1', option.margin.top)
          .attr('x2', pointX)
          .attr('y2', size.height - option.margin.bottom)
          .datum(half)
          .call(dragReferenceLine);
    }

    // 触发选择事件一次
    trigOnSelectLineEvent();

    svg.on('click', function () {
      if (d3.event.defaultPrevented) {
        return;
      }

      var e = d3.mouse(d3.select('#chart').node());
      // 点在外面的不处理
      if (e[0] < option.marginL() || e[0] > (size.width - option.marginR())) {
        return;
      }
      // 处理数据问题， 如果与原来相比有缩放，那么要处理缩放问题
      var l = x.invert(e[0] / option.scale - option.margin.left);
      var index = Math.round(l);
      index = fixIndexOutRange(index);

      var pointX = xInSvg(l);

      var pointY = e[1] - option.marginT();
      var referenceL = l - 100;
      var referencePointX = xInSvg(referenceL);

      if (option.showReferenceLine) {
        if (referenceLine) {
          referenceLine.style('display', null);
        } else {
          referenceLine = svg.append('line')
              .attr('class', 'reference-line')
              .attr('x1', referencePointX)
              .attr('y1', option.marginT())
              .attr('x2', referencePointX)
              .attr('y2', size.height - option.marginB())
              .datum(Math.round(referenceL))
              .call(dragReferenceLine);
        }
      }

      if (selectLine) {
        selectLine.attr('x1', pointX)
            .attr('x2', pointX)
            .datum(index)
            .style('display', null);
      } else {
        selectLine = svg.append('line')
            .attr('class', 'select-line')
            .attr('x1', pointX)
            .attr('y1', option.marginT())
            .attr('x2', pointX)
            .attr('y2', size.height - option.marginB())
            .datum(index)
            .call(dragSelectLine);
      }

      if (!selectTip) {
        selectTip = svg.append('g')
            .attr('class', 'select-tip')
            .attr('transform', 'translate(' + pointX + ',' + option.marginT() + ')')
            .style('display', 'none');

        selectTip.append('rect')
            .attr('class', 'chart-tip')
            .attr("width", chartTipRectWidth)
            .attr("height", chartTipRectHeight)
            .attr('x', 0)
            .attr('y', 0);
      }

      // 更新提示
      updateSelectTip(selectTip, pointX, pointY, index);

    });

    function update(newDataArray) {

      if (newDataArray !== undefined) {
        option.dataArray = newDataArray;
      }

      // 绘制图表, 感应电压/载频/低频,速度
      drawChart(chartOffset, chartHeight);

      // 绘制灯带
      drawLampBelt(lampBeltOffset, gridHeight * 2.5, gridHeight * 1.5 / 2);

      // 绘制信号机
      drawSemaphore(semaphoreOffset, semaphoreHeight);

      // 准备一个映射器
      var y = d3.scale.linear()
          .domain([0, 1])
          .range([gridHeight * 2, 0]);

      // 绘制绝缘
      drawChairLine(insulationOffset, 'insulation', function (d) {
        return y(d.insulation || 0);
      }, function (d) {
        return (d.insulation === 0 || d.insulation === 1);
      });

      // 绘制上/下行
      drawChairLine(upDownOffset, 'updown', function (d) {
        return y(d.upDown === 'X' ? 1 : 0);
      }, function (d) {
        return (d.upDown === 'X' || d.upDown === 'S');
      });

      // 绘制A/B机
      drawChairLine(abOffset, 'ab', function (d) {
        return y(d.ab || 0);
      }, function (d) {
        return (d.ab === 0 || d.ab === 1);
      });

      // 绘制 1/2 端
      drawChairLine(port12Offset, 'port12', function (d) {
        return y(d.port12 || 0);
      }, function (d) {
        return (d.port12 === 0 || d.port12 === 1);
      });

      // 绘制 x 轴
      drawXAxis(option.marginT() + height);
    }

    function addDefs() {

      var defs = svg.append('defs');

      // 绝缘/上下行/ab机/iii端渐变
      defs.append("linearGradient")
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('spreadMethod', 'pad')
          .attr("id", "line-gradient-1")
          .attr("x1", '0%').attr("y1", '0%')
          .attr("x2", '0%').attr("y2", '100%')
          .selectAll("stop")
          .data([
                  {offset: gridHeight / size.height, color: option.lineColor1},
                  {offset: gridHeight / size.height, color: option.lineColor2},
                  {offset: gridHeight * 2 / size.height, color: option.lineColor2}
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
                  {offset: "47%", color: "#FE2"},
                  {offset: "47%", color: "black"},
                  {offset: "53%", color: "black"},
                  {offset: "53%", color: "#FE2"},
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
                  {offset: "47%", color: "red"},
                  {offset: "47%", color: "black"},
                  {offset: "53%", color: "black"},
                  {offset: "53%", color: "#FE2"},
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
                  {offset: "0%", color: "#02c202"},
                  {offset: "47%", color: "#02c202"},
                  {offset: "47%", color: "black"},
                  {offset: "53%", color: "black"},
                  {offset: "53%", color: "#FE2"},
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

      // 彩灯
      defs.append("linearGradient")
          .attr("id", "line-gradient-lamp-c")
          .attr("x1", '0%').attr("y1", '0%')
          .attr("x2", '0%').attr("y2", '100%')
          .selectAll("stop")
          .data([
                  {offset: 1/7, color: "#fb111c"},
                  {offset: 2/7, color: "#fc8511"},
                  {offset: 3/7, color: "#f3f112"},
                  {offset: 4/7, color: "#53ef08"},
                  {offset: 5/7, color: "#11faf4"},
                  {offset: 6/7, color: "#11a5fb"},
                  {offset: 7/7, color: "#ef12f3"}
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
                  {offset: "0%", color: "#02c202"},
                  {offset: "50%", color: "#02c202"},
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

      // 灯带, 彩灯
      defs.append("linearGradient")
          .attr("id", "line-gradient-lamp-belt-c")
          .attr("x1", '0%').attr("y1", '0%')
          .attr("x2", '0%').attr("y2", '100%')
          .selectAll("stop")
          .data([
                  {offset: 1/7, color: "#fb111c"},
                  {offset: 2/7, color: "#fc8511"},
                  {offset: 3/7, color: "#f3f112"},
                  {offset: 4/7, color: "#53ef08"},
                  {offset: 5/7, color: "#11faf4"},
                  {offset: 6/7, color: "#11a5fb"},
                  {offset: 7/7, color: "#ef12f3"}
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
          .attr('y', chartOffset + fontSizeOffset)
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
          .attr("y", chartOffset + fontSizeOffset)
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
          .attr('y', chartOffset + fontSizeOffset + option.fontSize + chartLabelMarginTop)
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
          .attr("y", chartOffset + fontSizeOffset + option.fontSize + chartLabelMarginTop)
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
          .attr('y', chartOffset + fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 2)
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
          .attr("y", chartOffset + fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 2)
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
          .attr('y', chartOffset + fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 3)
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
          .attr("y", chartOffset + fontSizeOffset + (option.fontSize + chartLabelMarginTop) * 3)
          .attr("dy", ".35em")
          .text(speedText())
          .on('click', function () {
            option.currentSpeedToggle = !option.currentSpeedToggle;
            updateSpeed(0);
          });

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", lampBeltOffset + fontSizeOffset + gridHeight / 2)
          .attr("dy", ".4em")
          .text('灯码');

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", semaphoreOffset + gridHeight * 2 + fontSizeOffset)
          .attr("dy", ".35em")
          .text('信号机');

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", insulationOffset + fontSizeOffset)
          .attr("dy", ".35em")
          .text('绝缘');

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", upDownOffset + fontSizeOffset)
          .attr("dy", ".35em")
          .text('上/下行');

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", abOffset + fontSizeOffset)
          .attr("dy", ".35em")
          .text('A/B机');

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", port12Offset + fontSizeOffset)
          .attr("dy", ".35em")
          .text('Ⅰ/Ⅱ端');

      svg.append('text')
          .attr("x", option.labelLeftMargin)
          .attr("y", option.marginT() + height + fontSizeOffset)
          .attr("dy", ".35em")
          .text('时间里程');
    }

    /**
     * 绘制图表的部分
     */
    function drawChart(chartOffset, chartHeight) {

      // 绘制竖方向网格
      function makeXAxis() {
        return d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(10);
      }

      // 绘制水平方向网格
      function makeYAxis() {
        return d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5);
      }

      var groupChart = svg.select('g.lineChart');

      var y = d3.scale.linear()
          .domain([0, option.voltageMaxs[option.currentVoltageMaxIndex]])
          .range([chartHeight, 0]);

      if (groupChart.size() === 0) {
        // 添加组
        groupChart = svg.append('g')
            .attr('class', 'lineChart')
            .attr('transform', 'translate(' + option.marginL() + ',' + chartOffset + ')');

        groupChart.append("g")
            .attr("class", "grid")
            .call(makeXAxis().tickSize(chartHeight, 0, 0).tickFormat(''));

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
          return yVoltage(d.voltage || 0);
        });

        groupChart.append("path")
            .attr('class', 'path-voltage')
            .datum(option.dataArray)
            .attr("d", lineVoltage);
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
          return yCarrierFrequency(d.carrierFrequency || start);
        }).interpolate("step-after");

        groupChart.append("path")
            .datum(option.dataArray)
            .attr('class', 'line-carrier-frequency')
            .attr("d", lineCarrierFrequency);
      }

      // 绘制低频
      if (option.currentLowFrequencyToggle) {
        var yLowFrequency = d3.scale.linear()
            .domain([0, option.lowFrequencyMaxs[option.currentLowFrequencyMaxIndex]])
            .range([chartHeight, 0]);

        var lineLowFrequency = d3.svg.line().x(function (d, i) {
          return x(i);
        }).y(function (d) {
          return yLowFrequency(d.lowFrequency || 0);
        }).interpolate("step-after");

        groupChart.append("path")
            .datum(option.dataArray)
            .attr('class', 'line-low-frequency')
            .attr("d", lineLowFrequency);
      }

      // 绘制速度
      if (option.currentSpeedToggle) {
        var ySpeed = d3.scale.linear()
            .domain([0, option.speedMaxs[option.currentSpeedMaxIndex]])
            .range([chartHeight, 0]);

        var lineSpeed = d3.svg.line().x(function (d, i) {
          return x(i);
        }).y(function (d) {
          return ySpeed(d.speed || 0);
        });

        groupChart.append("path")
            .datum(option.dataArray)
            .attr("d", lineSpeed)
            .attr('class', 'line-speed');
      }
    }

    /**
     * 绘制实时灯状态
     */
    function drawLamp(lampBeltOffset, index, flash) {
      // 绘制当前灯
      var lampGroup = svg.select('g.lamp');
      if (lampGroup.size() == 0) {
        // 添加灯的分组
        lampGroup = svg.append('g')
            .attr('class', 'lamp')
            .attr('transform', 'translate(0,' + lampBeltOffset + ')');
      }

      var data = option.dataArray[index];

      if (data === undefined) {
        lampGroup.remove();
        if (it !== undefined) {
          clearInterval(it);
          it = undefined;
        }
        return;
      }

      var lampR = gridHeight * 1.5;
      var cx = option.labelLeftMargin + 55;

      // 绘制闪灯不显示
      var lamp;
      if (flash) {
        lamp = lampGroup.selectAll('circle')
            .data([data, 'the_light']);
      } else {
        lamp = lampGroup.selectAll('circle')
            .data([{
              lamp: 'OFF'
            }, 'the_light']);
      }

      var lampFill = function (d) {
        if (d === undefined) {
          return 'black';
        }

        if (d === 'the_light') {
          return 'url(#radial-gradient-lamp)';
        }

        if (d.lamp === '' || d.lamp === 'blank') {
          return 'black';
        } else if (d.lamp === 'L') {
          return '#02c202';
        } else if (d.lamp === 'U' || d.lamp === 'U2') {
          return '#FE2';
        } else if (d.lamp === 'H') {
          return 'red';
        } else if (d.lamp === 'B') {
          return 'white';
        } else if (d.lamp === 'OFF') {
          return 'lightgray';
        }

        if (d.lamp === undefined) {
          return null;
        }

        return 'url(#line-gradient-lamp-' + d.lamp.toLowerCase() + ')';
      };

      lamp.style('fill', lampFill);
      lamp.enter()
          .append('circle')
          .attr('cx', cx)
          .attr('cy', lampR)
          .attr('r', lampR)
          .style('fill', lampFill);
      lamp.exit().remove();


      // 黄2灯的字
      var lampTextSize = 8;
      var text;
      if (flash) {
        text = lampGroup.selectAll('text')
            .data([option.dataArray[index]]);
      } else {
        text = lampGroup.selectAll('text')
            .data([]);
      }

      text.text(function (d) {
        return (d !== undefined && d.lamp === 'U2') ? '2' : '';
      });

      text.enter().append('text')
          .attr("x", cx - lampTextSize / 2)
          .attr("y", lampR)
          .attr("dy", ".35em")
          .text(function (d) {
            return (d !== undefined && d.lamp === 'U2') ? '2' : '';
          });
      text.exit().remove();

      // 客户不要这个效果，就是上面发光的效果
      // 闪灯效果
      // if (data.lampType === 'flash') {
      //   intervalDrawLampFlash(lampGroup, cx, lampR);
      // } else {
      //   clearInterval(it);
      //   it = undefined;
      //   lampGroup.selectAll('path').remove();
      // }
    }

    /**
     * 周期性的重绘闪灯，表现出来就是一闪一闪
     */
    function intervalDrawLamp(lampBeltOffset, index) {
      // drawLampFlashLine(lampGroup, cx, lampR, flash[0]);
      drawLamp(lampBeltOffset, index, true);

      var data = option.dataArray[index];
      if (data !== undefined && data.lampType === 'flash') {

        if (it !== undefined) {
          clearInterval(it);
          it = undefined;
        }

        it = setInterval(function () {
          flashToggle = !flashToggle;
          drawLamp(lampBeltOffset, index, flashToggle);
        }, 500);

      } else {
        clearInterval(it);
        it = undefined;
        flashToggle = true;
      }


    }

    /**
     * 周期性的重绘闪灯效果
     */
    function intervalDrawLampFlash(lampGroup, cx, lampR) {
      drawLampFlashLine(lampGroup, cx, lampR, flash[0]);

      if (it !== undefined) {
        clearInterval(it);
        it = undefined;
      }

      it = setInterval(function () {
        var d = flash[flashIndex];
        drawLampFlashLine(lampGroup, cx, lampR, d);
        flashIndex ++;
        if (flashIndex > flash.length - 1) {
          flashIndex = 0;
        }
      }, 500);
    }

    /**
     * 模拟闪灯效果
     */
    function drawLampFlashLine(lampGroup, cx, lampR, d) {
      lampGroup.selectAll('path').remove();
      var angle = flashAngle;
      var hoffset = lampR;
      var length = lampR * 0.5 * d;

      // 计算从 0 点开始的角度/边长
      var hstart = -lampR * 1.3;
      var hstart2 = hstart * Math.cos(angle);
      var hstart3 = hstart * Math.cos(angle * 2);

      var hend = hstart - length;
      var hend2 = hend * Math.cos(angle);
      var hend3 = hend * Math.cos(angle * 2);

      var wstart = hstart * Math.sin(angle);
      var wstart2 = hstart * Math.sin(angle * 2);
      var wend = hend * Math.sin(angle);
      var wend2 = hend * Math.sin(angle * 2);

      var path = [
        'M', cx, hstart + hoffset,
        'L', cx, hend + hoffset,
        'M', cx + wstart, hstart2 + hoffset,
        'L', cx + wend, hend2 + hoffset,
        'M', cx - wstart, hstart2 + hoffset,
        'L', cx - wend, hend2 + hoffset,
        'M', cx + wstart2, hstart3 + hoffset,
        'L', cx + wend2, hend3 + hoffset,
        'M', cx - wstart2, hstart3 + hoffset,
        'L', cx - wend2, hend3 + hoffset,
        'Z'
      ];

      lampGroup.append("path")
          .attr('class', 'lamp-flash-line')
          .attr("d", path.join(' '));
    }

    /**
     * 绘制灯带
     */
    function drawLampBelt(lampBeltOffset, lampBeltHeight, lampBeltMargin) {
      // 添加灯带
      var lampBeltGroup = svg.select('g.lampBelt');
      if (lampBeltGroup.size() == 0) {
        svg.append('rect')
            .attr('class', 'lamp-background')
            .attr("width", width)
            .attr("height", lampBeltHeight + lampBeltMargin * 2)
            .attr('y', lampBeltOffset - lampBeltMargin)
            .attr('x', option.marginL());

        lampBeltGroup = svg.append('g')
            .attr('class', 'lampBelt')
            .attr('transform', 'translate(' + option.marginL() + ',' + lampBeltOffset + ')');
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
          return '#02c202';
        } else if (d.lamp === 'U') {
          return 'yellow';
        } else if (d.lamp === 'H') {
          return 'red';
        } else if (d.lamp === 'B') {
          return 'white';
        }

        if (d.lamp === undefined) {
          return null;
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

      // 处理事件
      var eventDatas = option.dataArray.reduce(
          function (previousValue, currentValue, currentIndex) {
            // 有事件的筛选出来
            if (currentValue.event) {
              previousValue.push({
                                   index: currentIndex,
                                   event: currentValue.event
                                 });
            }
            return previousValue;
          }, []);

      var event = lampBeltGroup.selectAll("path")
          .data(eventDatas);

      event.attr('d', function (d) {
        var xs = x(d.index);
        var ys = lampBeltHeight;
        var h = lampBeltHeight * 0.5;
        var halfLengthOfSide = h * 2 / Math.sqrt(3) / 2;

        var path = [
          'M', xs, ys,
          'L', xs - halfLengthOfSide, ys + h,
          'L', xs + halfLengthOfSide, ys + h,
          'L', xs, ys,
          'Z'
        ];

        return path.join(" ");
      });

      event.enter()
          .append("path")
          .attr('class', 'event')
          .attr('d', function (d) {
            var xs = x(d.index);
            var ys = lampBeltHeight;
            var h = lampBeltHeight * 0.5;
            var halfLengthOfSide = h * 2 / Math.sqrt(3) / 2;

            var path = [
              'M', xs, ys,
              'L', xs - halfLengthOfSide, ys + h,
              'L', xs + halfLengthOfSide, ys + h,
              'L', xs, ys,
              'Z'
            ];

            return path.join(" ");
          });

      event.exit().remove();
    }

    /**
     * 绘制阶梯图
     */
    function drawChairLine(seamaphoreOffset, cls, generateorY, defined) {

      svg.select('g.' + cls).remove();
      var g = svg.append('g')
          .attr('class', cls)
          .attr('transform', 'translate(' + option.marginL() + ',' + seamaphoreOffset + ')');

      var line = d3.svg.line()
          .x(function (d, i) {
            return x(i);
          })
          .y(generateorY)
          .defined(defined)
          .interpolate("step-after");

      g.append("path")
          .datum(option.dataArray)
          .attr('class', 'chair-line')
          .attr("d", line);
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
        svg.append('line')
            .attr('class', 'semaphore-under-line')
            .attr('x1', option.marginL())
            .attr('y1', seamaphoreOffset + semaphoreHeight)
            .attr('x2', size.width - option.marginR())
            .attr('y2', seamaphoreOffset + semaphoreHeight);
      } else {
        // 删掉原来绘制的
        g.remove();
      }

      // 绘制信号
      var heightUnit = semaphoreHeight / 6;
      g = svg.append('g')
          .attr('class', 'semaphore')
          .attr('transform', 'translate(' + option.marginL() + ',' + seamaphoreOffset + ')');

      // 过滤数据
      var lastIndexData;
      var stationDatas = option.dataArray.reduce(
          function (previousValue, currentValue, currentIndex) {

            // 跳过无效值
            if (currentValue.seamaphoreState === undefined || currentValue.seamaphoreState === '') {
              return previousValue;
            }

            if (lastIndexData !== undefined &&
                (lastIndexData.seamaphoreNo !== currentValue.seamaphoreNo
                 || lastIndexData.seamaphoreState !== currentValue.seamaphoreState)) {
              // 前一个状态和现在这个不同, 说明需要图表上绘制一下
              previousValue.push({
                                   index: currentIndex,
                                   value: lastIndexData
                                 });
            }

            lastIndexData = currentValue;
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
                                   'A', heightUnit / 2, heightUnit / 2, 0, 1, 0, 0,
                                   heightUnit * 3.9,
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
          });

      grid.append('text')
          .attr('class', 'label-1')
          .attr("x", heightUnit)
          .attr("y", heightUnit)
          .attr("dy", ".25em")
          .text(function (d) {
            if (d.value.seamaphoreState === 'in') {
              return d.value.stationNo;
            } else {
              return '';
            }
          });

      grid.append('text')
          .attr('class', 'label-2')
          .attr("x", heightUnit)
          .attr("y", heightUnit * 3)
          .attr("dy", ".25em")
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
          .attr('class', 'label-3')
          .attr("x", 2)
          .attr("y", heightUnit * 5)
          .attr("dy", ".4em")
          .text(function (d) {
            return (d.value.upDown || '') + ' ' + (d.value.seamaphoreNo || '');
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

            if (!option.dataArray[d].date) {
              return '';
            }

            if (d == 0) {
              return option.firstDateLabelFormat(option.dataArray[d].date);
            } else {
              return option.dateLabelFormat(option.dataArray[d].date);
            }
          });

      var g = svg.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(" + option.marginL() + "," + xAxisOffset + ")")
          .call(xAxis);

      // 绘制上电标志
      var powerOnDatas = option.dataArray.reduce(
          function (previousValue, currentValue, currentIndex) {
            // 有上电标志的
            if (currentValue.powerOnFlag) {
              previousValue.push({
                                   index: currentIndex,
                                   powerOnFlag: currentValue.powerOnFlag
                                 });
            }
            return previousValue;
          }, []);

      var powerOn = g.selectAll("path.power-on")
          .data(powerOnDatas);

      powerOn.attr('d', function (d) {
        var xs = x(d.index);
        var ys = 0;
        var h = gridHeight * 0.85;
        var halfLengthOfSide = h * 2 / Math.sqrt(3) / 2;

        var path = [
          'M', xs, ys,
          'L', xs - halfLengthOfSide, ys + h,
          'L', xs + halfLengthOfSide, ys + h,
          'L', xs, ys,
          'Z'
        ];

        return path.join(" ");
      });

      powerOn.enter()
          .append("path")
          .attr('class', 'power-on')
          .attr('d', function (d) {
            var xs = x(d.index);
            var ys = 0;
            var h = gridHeight * 0.85;
            var halfLengthOfSide = h * 2 / Math.sqrt(3) / 2;

            var path = [
              'M', xs, ys,
              'L', xs - halfLengthOfSide, ys + h,
              'L', xs + halfLengthOfSide, ys + h,
              'L', xs, ys,
              'Z'
            ];

            return path.join(" ");
          });

      powerOn.exit().remove();
    }

    /**
     * 计算图表的大小, 根据容器大小自适应
     * @returns {{width: *, height: number}} 图表的大小
     */
    function calcChartSize() {
      var boxWidth, box = d3.select(option.chartContainerSelector).node().getBoundingClientRect();
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

    function updateSize() {
      _svgSize = calcChartSize();
      svg.attr('height', _svgSize.height);

      // 计算缩放比例
      option.scale = _svgSize.width / size.width;
    }

    function xInSvg(index) {
      if (index <= 0) {
        return option.margin.left;
      }
      return x(index) + option.margin.left;
    }

    var updateVoltage = function (val) {
      option.currentVoltageMaxIndex += val;
      if (val > 0 && option.currentVoltageMaxIndex > option.voltageMaxs.length - 1) {
        option.currentVoltageMaxIndex = option.voltageMaxs.length - 1;
      } else if (val < 0 && option.currentVoltageMaxIndex < 0) {
        option.currentVoltageMaxIndex = 0;
      }

      drawChart(chartOffset, chartHeight);
      updateVoltageLabel();
    };

    var updateCarrierFrequency = function (val) {
      option.currentCarrierFrequencyMaxIndex += val;
      if (val > 0 && option.currentCarrierFrequencyMaxIndex > option.carrierFrequencyMaxs.length
                                                              - 1) {
        option.currentCarrierFrequencyMaxIndex = option.carrierFrequencyMaxs.length - 1;
      } else if (val < 0 && option.currentCarrierFrequencyMaxIndex < 0) {
        option.currentCarrierFrequencyMaxIndex = 0;
      }

      drawChart(chartOffset, chartHeight);
      updateCarrierFrequencyLabel();
    };

    var updateLowFrequency = function (val) {
      option.currentLowFrequencyMaxIndex += val;
      if (val > 0 && option.currentLowFrequencyMaxIndex > option.lowFrequencyMaxs.length - 1) {
        option.currentLowFrequencyMaxIndex = option.lowFrequencyMaxs.length - 1;
      } else if (val < 0 && option.currentLowFrequencyMaxIndex < 0) {
        option.currentLowFrequencyMaxIndex = 0;
      }

      drawChart(chartOffset, chartHeight);
      updateLowFrequencyLabel();
    };

    var updateSpeed = function (val) {
      option.currentSpeedMaxIndex += val;
      if (val > 0 && option.currentSpeedMaxIndex > option.speedMaxs.length - 1) {
        option.currentSpeedMaxIndex = option.speedMaxs.length - 1;
      } else if (val < 0 && option.currentSpeedMaxIndex < 0) {
        option.currentSpeedMaxIndex = 0;
      }

      drawChart(chartOffset, chartHeight);
      updateSpeedLabel();
    };

    function updateVoltageLabel() {
      d3.select('#voltageLabel').text(voltageText());
      d3.select('#voltageLabelToggle').text(toggleText(option.currentVoltageToggle))
    }

    function updateCarrierFrequencyLabel() {
      d3.select('#carrierFrequencyLabel').text(carrierFrequencyText());
      d3.select('#carrierFrequencyLabelToggle')
          .text(toggleText(option.currentCarrierFrequencyIndexToggle));
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
        (option.dataArray[i].voltage || '未提供') + 'mV',
        (option.dataArray[i].carrierFrequency || '未提供') + 'Hz',
        (option.dataArray[i].lowFrequency || '未提供') + '(Hz/ms)',
        (option.dataArray[i].speed || '未提供') + '(km/h)'
      ];
    }

    function trigOnSelectLineEvent() {

      var index = fixIndexOutRange(selectLine.datum());
      var start = 0;
      if (option.showReferenceLine && referenceLine) {
        start = fixIndexOutRange(referenceLine.datum());
      }

      option.onSelectLine(index, option.dataArray[index], start, option.dataArray[start]);
    }

    function updateSelectTip(selectTip, pointX, pointY, index) {

      // 绘制灯码
      intervalDrawLamp(lampBeltOffset, index);

      var labelData = chartSelectTip(index);
      var mouseMargin = {
        x: 8,
        y: 8
      };

      var translateX = (pointX + mouseMargin.x), translateY = (pointY + mouseMargin.y);

      if (translateX + chartTipRectWidth > size.width) {
        translateX = pointX - chartTipRectWidth - mouseMargin.x;
      }

      if (translateY + chartTipRectHeight > size.height) {
        translateY = size.height - chartTipRectHeight;
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
          .attr('class', function (d, i) {

            if (i === 0) {
              return 'voltage-label-tip';
            } else if (i === 1) {
              return 'carrier-frequency-label-tip';
            } else if (i === 2) {
              return 'low-frequency-label-tip';
            } else {
              return 'speed-label-tip';
            }
          })
          .attr('x', 0)
          .attr('y', function (d, i) {
            return i * option.fontSize;
          })
          .attr('dy', '1em')
          .text(function (d) {
            return d;
          });

      var bg = selectTip.select('rect');
      if (index < 0 || index > option.dataArray.length - 1) {
        bg.style('display', 'none');
      } else {
        bg.style('display', null);
      }

      // 触发事件处理函数
      trigOnSelectLineEvent();

      // 隔多少秒隐藏
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }

      timeoutHandler = setTimeout(function () {
        selectTip.select('rect').style('display', 'none');
        selectTip.selectAll('text').style('display', 'none');
      }, 3000);
    }

    var toggleSelectLine = function () {

      var toggleDisplay = function (element) {
        if (element) {
          if (element.style('display') !== 'none') {
            element.style('display', 'none');
          } else {
            element.style('display', null);
          }
        }
      };

      // toggleDisplay(selectLine);
      // toggleDisplay(selectTip);
      toggleDisplay(referenceLine);
    };

    function fixIndexOutRange(x) {
      if (x >= option.xAxisMax) {
        x = option.xAxisMax - 1;
      }

      if (x < 0) {
        x = 0;
      }
      return x;
    }

    return {
      update: update,
      updateVoltage: updateVoltage,
      updateCarrierFrequency: updateCarrierFrequency,
      updateLowFrequency: updateLowFrequency,
      updateSpeed: updateSpeed,
      toggleSelectLine: toggleSelectLine,
      updateSize: updateSize,
      size: _svgSize
    };
  };

  return xhchart;
}());