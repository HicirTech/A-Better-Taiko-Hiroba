// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v17)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.2"),
        .package(name: "CapacitorApp", path: "../../../../node_modules/@capacitor/app"),
        .package(name: "CapacitorFilesystem", path: "../../../../node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorInappbrowser", path: "../../../../node_modules/@capacitor/inappbrowser"),
        .package(name: "CapacitorShare", path: "../../../../node_modules/@capacitor/share"),
        .package(name: "CapacitorSplashScreen", path: "../../../../node_modules/@capacitor/splash-screen"),
        .package(name: "CapacitorToast", path: "../../../../node_modules/@capacitor/toast")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorInappbrowser", package: "CapacitorInappbrowser"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorToast", package: "CapacitorToast")
            ]
        )
    ]
)
