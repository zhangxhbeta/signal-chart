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
  var ieFix = 1;

  // 获取当前 chart 可用宽度, 然后根据比例算出可用高度
  var size = calcChartSize();

  // 根据窗口高度布局一次详情表格高度, 然后绑定 resiz 事件处理
  // 这里做了响应式, 如果是手机屏幕就不做自适应了
  if ($(window).innerWidth() > 767) {
    layoutDetail(size.height);
  }

  // 开始部分，准备svg画布
  var svg = d3.select('#chart').append('svg')
      .attr('width', '100%')
      .attr('height', size.height)
      .attr('viewBox', '0 0 ' + size.width + " " + size.height)
      // .attr('preserveAspectRatio', 'none')
      .style('display', 'block');
  d3.select('#version').html('v' + d3.version);

  var xAxisMax = 200;
  var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 150
  };

  // svg 画布已准备妥当，开始准备图表元素
  var height = size.height - margin.bottom - margin.top,
      width = size.width - margin.left - margin.right;
  var gridHeight = height / 50;
  var gridWidth = width / xAxisMax;

  // 准备全局 x 轴缩放器
  var x = d3.scale.linear()
      .domain([0, xAxisMax])
      .range([0, width]);

  // 生成测试数据
  var dataArray = generateTestData();

  // 绘制图表, 感应电压/载频/低频,速度
  var chartHeight = gridHeight * 20;
  drawChart(chartHeight);

  // 绘制灯带
  var lampBeltHeight = chartHeight + gridHeight;
  drawLampBelt(lampBeltHeight);

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
  function drawChart(chartHeight) {
    var maxVoltage = 2000, maxCarrierFrequency = 4000, maxLowFrequency = 40;

    svg.append('text')
        .attr("x", 0)
        .attr("y", 12)
        .attr("dy", ".35em")
        .text('2000mV');

    svg.append('text')
        .attr("x", 0)
        .attr("y", 12 * 2)
        .attr("dy", ".35em")
        .text('4000 Hz');

    svg.append('text')
        .attr("x", 0)
        .attr("y", 12 * 3)
        .attr("dy", ".35em")
        .text('40(Hz/ms)');

    svg.append('text')
        .attr("x", 0)
        .attr("y", gridHeight * 10)
        .attr("dy", ".55em")
        .text('上电标志');

    // 添加组
    var groupChart = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',0)');

    // 绘制竖方向网格
    function makeXAxis() {
      return d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .ticks(25);
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
        .style("stroke", '#F00')
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
        .style("stroke", '#00f')
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
        .style("stroke", '#0f0')
        .style("stroke-opacity", 0.9);
  }

  /**
   * 绘制灯带
   */
  function drawLampBelt(lampBeltHeight) {
    svg.append('text')
        .attr("x", 20)
        .attr("y", lampBeltHeight)
        .attr("dy", ".55em")
        .text('灯码超防');

    var lampBeltGroup = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + lampBeltHeight + ')');

    var grid = lampBeltGroup.selectAll("g")
        .data(dataArray)
        .enter()
        .append("g")
        .attr("transform", function (d, i) {
          return 'translate(' + x(i) + ',0)';
        });

    grid.append("rect")
        .attr("width", gridWidth - 1)
        .attr("height", gridHeight);
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
    var dataArray = [];
    var carrierFrequencyRandom = 0, lowFrequencyRandom = 0;
    for (var i = 0; i < xAxisMax; i++) {
      var lamp = '' + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
              Math.random())
                 + Math.round(Math.random()) + Math.round(Math.random()) + Math.round(
              Math.random());
      var voltage = Math.round(Math.random() * 1300);

      var carrierFrequency;
      if (carrierFrequencyRandom == 0) {
        carrierFrequencyRandom = Math.round(Math.random() * 8);
        carrierFrequency = Math.round(Math.random() * 3200);
      } else {
        carrierFrequency = dataArray[i - 1].carrierFrequency;
        carrierFrequencyRandom -= 1;
      }

      var lowFrequency;
      if (lowFrequencyRandom == 0) {
        lowFrequencyRandom = Math.round(Math.random() * 4);
        lowFrequency = Math.round(Math.random() * 28);
      } else {
        lowFrequency = dataArray[i - 1].lowFrequency;
        lowFrequencyRandom -= 1;
      }

      dataArray.push({
                       lamp: lamp,
                       voltage: voltage,
                       carrierFrequency: carrierFrequency,
                       lowFrequency: lowFrequency
                     });
    }

    return dataArray;
  }
});