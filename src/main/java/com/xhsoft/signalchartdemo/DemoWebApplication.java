package com.xhsoft.signalchartdemo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;
import org.springframework.core.env.SimpleCommandLinePropertySource;
import org.springframework.web.WebApplicationInitializer;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;

import javax.inject.Inject;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;

@SpringBootApplication
public class DemoWebApplication {

  private static final Logger log = LoggerFactory.getLogger(DemoWebApplication.class);

  @Inject
  private Environment env;

  /**
   * 嵌入 Tomcat 服务器运行入口.
   */
  public static void main(String[] args) {
    SpringApplication app = new SpringApplication(DemoWebApplication.class);

    // 直接启动时如果没有设定 profile, 给一个 dev 的环境
    SimpleCommandLinePropertySource source = new SimpleCommandLinePropertySource(args);
    addDefaultProfile(app, source);
    Environment env = app.run(args).getEnvironment();

    try {
      String contextPath = env.getProperty("server.contextPath") != null
          ? env.getProperty("server.contextPath") : "";
      String port = env.getProperty("server.port") != null ? env.getProperty("server.port") : "8080";

      log.info("服务器地址列表:\n----------------------------------------------------------\n"
              + "\t本地地址: \thttp://localhost:{}{}\n"
              + "\t其他机器: \thttp://{}:{}{}\n----------------------------------------------------------",
          port, contextPath,
          InetAddress.getLocalHost().getHostAddress(),
          port, contextPath);
    } catch (UnknownHostException e) {
      // 打印地址失败, 不过没关系
    }
  }

  /**
   * 添加默认的环境 dev, 不过目前还没处理好在 Tomcat 容器环境下的默认 profile, 也就是说 如果是 嵌入式运行, 那么是有一个 dev 的环境, 如果是部署到 tomcat,
   * 默认是没环境(profile) 的
   */
  private static void addDefaultProfile(SpringApplication app, SimpleCommandLinePropertySource source) {
    if (!source.containsProperty("spring.profiles.active") &&
        !System.getenv().containsKey("SPRING_PROFILES_ACTIVE")) {
      app.setAdditionalProfiles("dev");
    }
  }

  // @Override
  // public void onStartup(ServletContext servletContext) throws ServletException {
  //   if (env == null) {
  //     log.info("开始 Web 应用配置, profiles: None");
  //   } else {
  //     log.info("开始 Web 应用配置, profiles: {}", Arrays.toString(env.getActiveProfiles()));
  //   }
  // }
}
