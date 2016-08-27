/**
 * 往文档里面的 #chart 里面塞一张堆积图
 *
 * @author zhangxh
 */
$(function () {

  // 首先计算一下高度宽度
  var aspectRatio = 3; // 图表高度宽度比例 1:3
  var minDetailHeight = 30; // 详情区域最小高度 30px
  var smallDevicesWidth = 767; // 小屏幕宽度, 超出认定为其他大小
  var ieFix = 1;  // ie 滚动条出现, 所以高度要减去1
  var gridSize = 44; // 将大图表横向划分为固定的高度单元, 然后方便分配
  var xAxisMax = 200; // 图表中展示的数据记录条数
  var margin = {
    top: 5,
    right: 28,
    bottom: 25,
    left: 150
  };
  var fontSize = 12;
  var fontSizeOffset = fontSize / 2;
  var labelLeftMargin = 30;
  var firstDateLabelFormat = d3.time.format('%Y-%m-%d');
  var dateLabelFormat = d3.time.format("%H:%M:%S");


  // 获取当前 chart 可用宽度, 然后根据比例算出可用高度
  var size = calcChartSize();

  // 根据窗口高度布局一次详情表格高度, 然后绑定 resiz 事件处理
  // 这里做了响应式, 如果是手机屏幕就不做自适应了
  if ($(window).innerWidth() > smallDevicesWidth) {
    layoutDetail(size.height);
  }

  // 开始部分，准备svg画布
  var svg = d3.select('#chart').append('svg')
      .attr('width', '100%')
      .attr('height', size.height)
      .attr('viewBox', '0 0 ' + size.width + " " + size.height)
      .style('display', 'block');
  d3.select('#version').html('v' + d3.version);

  // svg 画布已准备妥当，开始准备图表元素
  var height = size.height - margin.bottom - margin.top,
      width = size.width - margin.left - margin.right;
  var gridHeight = height / gridSize;
  var gridWidth = width / xAxisMax;

  // 准备全局 x 轴缩放器
  var x = d3.scale.linear()
      .domain([0, xAxisMax])
      .range([0, width]);

  // 生成测试数据
  var dataArray = generateTestData();

  // 绘制图表, 感应电压/载频/低频,速度
  var chartOffset = margin.top;
  var chartHeight = gridHeight * 20;
  drawChart(chartOffset, chartHeight);

  // 绘制灯带
  var lampBeltOffset = chartOffset + chartHeight + gridHeight;
  drawLampBelt(lampBeltOffset, gridHeight * 1.5);

  // 绘制信号机
  var y = d3.scale.linear()
      .domain([0, 1])
      .range([gridHeight * 2, 0]);

  // 绘制信号机
  var semaphoreOffset = lampBeltOffset + gridHeight * 3;
  drawChairLine(semaphoreOffset, '信号机', function (d) {
    return y(d.seamaphore);
  });

  // 绘制绝缘
  var insulationOffset = semaphoreOffset + gridHeight * 4;
  drawInsulationChairLine(insulationOffset, '绝缘', function (d) {
    return y(d.insulation);
  });

  // 绘制上/下行
  var upDownOffset = insulationOffset + gridHeight * 4;
  drawChairLine(upDownOffset, '上/下行', function (d) {
    return y(d.upDown);
  });

  // 绘制A/B机
  var abOffset = upDownOffset + gridHeight * 4;
  drawChairLine(abOffset, 'A/B机', function (d) {
    return y(d.ab);
  });

  // 绘制 1/2 端
  var port12Offset = abOffset + gridHeight * 4;
  drawChairLine(port12Offset, '1/2端', function (d) {
    return y(d.port12);
  });

  // 绘制 x 轴
  drawXAxis(margin.top + height, '时间里程');

  // 对窗口缩放做一下处理
  $(window).resize(function () {
    var size = calcChartSize();
    $('#chart svg').height(size.height);

    if ($(window).innerWidth() > 767) {
      layoutDetail(size.height);
    }
  });

  /**
   * 绘制图表的部分
   */
  function drawChart(chartOffset, chartHeight) {
    var maxVoltage = 2000, maxCarrierFrequency = 4000, maxLowFrequency = 40;

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + fontSizeOffset)
        .attr("dy", ".35em")
        .text(maxVoltage + 'mV');

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + fontSizeOffset + fontSize)
        .attr("dy", ".35em")
        .text(maxCarrierFrequency + 'Hz');

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + fontSizeOffset + fontSize * 2)
        .attr("dy", ".35em")
        .text(maxLowFrequency + '(Hz/ms)');

    svg.append('text')
        .attr("x", 0)
        .attr("y", chartOffset + gridHeight * 6)
        .attr("dy", ".55em")
        .text('上电标志');

    // 添加组
    var groupChart = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + chartOffset + ')');

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

    // 绘制感应电压
    var yVoltage = d3.scale.linear()
        .domain([0, maxVoltage])
        .range([chartHeight, 0]);

    var lineVoltage = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(function (d) {
      return yVoltage(d.voltage);
    });

    // 绘制背景网格/x/y轴
    function makeYAxis() {
      return d3.svg.axis()
          .scale(yVoltage)
          .orient("left")
          .ticks(5);
    }

    groupChart.append("g")
        .attr("class", "grid")
        .call(makeYAxis().tickSize(-width, 0, 0).tickFormat(''));

    groupChart.append("path")
        .datum(dataArray)
        .attr("d", lineVoltage)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#d00')
        .style("stroke-opacity", 0.9);

    // 绘制载频
    var yCarrierFrequency = d3.scale.linear()
        .domain([0, maxCarrierFrequency])
        .range([chartHeight, 0]);

    var lineCarrierFrequency = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(function (d) {
      return yCarrierFrequency(d.carrierFrequency);
    }).interpolate("step-after");

    groupChart.append("path")
        .datum(dataArray)
        .attr("d", lineCarrierFrequency)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#0d0')
        .style("stroke-opacity", 0.9);

    // 绘制低频
    var yLowFrequency = d3.scale.linear()
        .domain([0, maxLowFrequency])
        .range([chartHeight, 0]);

    var lineLowFrequency = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(function (d) {
      return yLowFrequency(d.lowFrequency);
    }).interpolate("step-after");

    groupChart.append("path")
        .datum(dataArray)
        .attr("d", lineLowFrequency)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#00d')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制灯带
   */
  function drawLampBelt(lampBeltOffset, lampBeltHeight) {
    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", lampBeltOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text('灯码超防');

    // 绘制当前灯
    var circleRadii = [gridHeight, gridHeight * 0.4, gridHeight * 0.2];
    var groupLamp = svg.append('g')
        .attr('transform', 'translate(0,' + lampBeltOffset + ')');

    groupLamp.selectAll("circle")
        .data(circleRadii)
        .enter()
        .append('circle')
        .attr("cx", gridHeight)
        .attr("cy", gridHeight)
        .attr("r", function (d) {
          return d;
        })
        .style("fill", function (d) {
          var returnColor;
          var r = d / gridHeight;
          if (r === 1) {
            returnColor = "green";
          } else if (r >= 0.4) {
            returnColor = "purple";
          } else if (r >= 0.2) {
            returnColor = "red";
          }
          return returnColor;
        });

    var lampBeltGroup = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + lampBeltOffset + ')');

    var grid = lampBeltGroup.selectAll("g")
        .data(dataArray)
        .enter()
        .append("g")
        .attr("transform", function (d, i) {
          return 'translate(' + x(i) + ',0)';
        });

    grid.append("rect")
        .attr("width", gridWidth - 1)
        .attr("height", lampBeltHeight)
        .style("stroke", '#0dd')
  }

  /**
   * 绘制阶梯图
   */
  function drawChairLine(seamaphoreOffset, text, generateorY) {
    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", seamaphoreOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text(text);

    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + seamaphoreOffset + ')');

    var line = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(generateorY).interpolate("step-after");

    g.append("path")
        .datum(dataArray)
        .attr("d", line)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", '#000')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制绝缘图 (多了颜色变换)
   */
  function drawInsulationChairLine(seamaphoreOffset, text, generateorY) {
    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", seamaphoreOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text(text);

    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + seamaphoreOffset + ')');

    var line = d3.svg.line().x(function (d, i) {
      return x(i);
    }).y(generateorY).interpolate("step-after");

    g.append("linearGradient")
        .attr("id", "line-gradient")
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

    g.append("path")
        .datum(dataArray)
        .attr("d", line)
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", 'url(#line-gradient)')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制 x 轴
   */
  function drawXAxis(xAxisOffset, text) {
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(function (d, i) {
          if (d >= dataArray.length) {
            return '';
          }
          if (d == 0) {
            return firstDateLabelFormat(dataArray[d].date);
          } else {
            return dateLabelFormat(dataArray[d].date);
          }
        });

    svg.append('text')
        .attr("x", labelLeftMargin)
        .attr("y", xAxisOffset + fontSizeOffset)
        .attr("dy", ".55em")
        .text(text);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + margin.left + "," + xAxisOffset + ")")
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
  function calcChartSize() {
    var boxWidth, box = d3.select("#chart").node().getBoundingClientRect();
    if (!box.width) {
      boxWidth = box.width;
    } else {
      boxWidth = box.right - box.left;
    }

    return {
      width: boxWidth,
      height: Math.floor(boxWidth / aspectRatio)
    }
  }

  /**
   * 生成测试用数据
   * @returns {Array}
   */
  function generateTestData() {
    var startDate = new Date().getTime() - 1000 * 60 * 60;
    var dataArray = [];
    var carrierFrequencyRandom = 0, lowFrequencyRandom = 0, seamaphoreRandom = 0,
        insulationRandom = 0, upDownRandom = 0, abRandom = 0, port12Random = 0;
    for (var i = 0; i <= xAxisMax; i++) {
      var lamp = '' + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
              Math.random())
                 + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
              Math.random());
      var voltage = Math.round(Math.random() * 800 + 600);

      var carrierFrequency;
      if (carrierFrequencyRandom == 0) {
        carrierFrequencyRandom = Math.round(Math.random() * 18);
        carrierFrequency = Math.round(Math.random() * 2900);
      } else {
        carrierFrequency = dataArray[i - 1].carrierFrequency;
        carrierFrequencyRandom -= 1;
      }

      var lowFrequency;
      if (lowFrequencyRandom == 0) {
        lowFrequencyRandom = Math.round(Math.random() * 20);
        lowFrequency = Math.round(Math.random() * 12);
      } else {
        lowFrequency = dataArray[i - 1].lowFrequency;
        lowFrequencyRandom -= 1;
      }

      var seamaphore;
      if (seamaphoreRandom == 0) {
        seamaphoreRandom = Math.round(Math.random() * 80);
        seamaphore = Math.round(Math.random());
      } else {
        seamaphore = dataArray[i - 1].seamaphore;
        seamaphoreRandom -= 1;
      }

      var upDown;
      if (upDownRandom == 0) {
        upDownRandom = Math.round(Math.random() * 50);
        upDown = Math.round(Math.random());
      } else {
        upDown = dataArray[i - 1].upDown;
        upDownRandom -= 1;
      }

      var insulation;
      if (insulationRandom == 0) {
        insulationRandom = Math.round(Math.random() * 10);
        insulation = Math.round(Math.random());
      } else {
        insulation = dataArray[i - 1].insulation;
        insulationRandom -= 1;
      }

      var ab;
      if (abRandom == 0) {
        abRandom = Math.round(Math.random() * 120);
        ab = Math.round(Math.random());
      } else {
        ab = dataArray[i - 1].ab;
        abRandom -= 1;
      }

      var port12;
      if (port12Random == 0) {
        port12Random = Math.round(Math.random() * 100);
        port12 = Math.round(Math.random());
      } else {
        port12 = dataArray[i - 1].port12;
        port12Random -= 1;
      }

      dataArray.push({
                       lamp: lamp,
                       voltage: voltage,
                       carrierFrequency: carrierFrequency,
                       lowFrequency: lowFrequency,
                       seamaphore: seamaphore,
                       upDown: upDown,
                       insulation: insulation,
                       ab: ab,
                       port12: port12,
                       date: new Date(startDate + i * 1000)
                     });
    }

    return dataArray;
  }
});